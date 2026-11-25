import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  generateInitialUsername,
  isActivationRole,
  isUsernameAvailableForRole,
  resolveAccountStatus,
  validateUsername,
} from "@/lib/activation";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { User } from "@/models";

export async function GET(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const activationStatus = searchParams.get("activationStatus");

    const andConditions: Record<string, unknown>[] = [];

    if (role && role !== "all") {
      andConditions.push({ role });
    }

    if (status === "inactive" || status === "Non-Aktif") {
      andConditions.push({ isActive: false });
    } else if (status === "unactivated" || status === "Belum Diaktivasi") {
      andConditions.push({
        isActive: { $ne: false },
        role: { $in: ["guru", "kurikulum"] },
        $or: [{ isActivated: false }, { mustChangePassword: true }],
      });
    } else if (status === "active" || status === "Aktif") {
      andConditions.push({
        isActive: { $ne: false },
        $nor: [
          {
            role: { $in: ["guru", "kurikulum"] },
            $or: [{ isActivated: false }, { mustChangePassword: true }],
          },
        ],
      });
    }

    if (activationStatus === "unactivated") {
      andConditions.push({
        isActive: { $ne: false },
        role: { $in: ["guru", "kurikulum"] },
        $or: [{ isActivated: false }, { mustChangePassword: true }],
      });
    } else if (activationStatus === "activated") {
      andConditions.push({
        isActivated: { $ne: false },
        mustChangePassword: { $ne: true },
      });
    }

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { loginUsername: { $regex: search, $options: "i" } },
          { nip: { $regex: search, $options: "i" } },
          { nisn: { $regex: search, $options: "i" } },
        ],
      });
    }

    const query: Record<string, unknown> =
      andConditions.length > 0 ? { $and: andConditions } : {};

    const rawUsers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const users = rawUsers.map((u) => {
      const { accountStatus, accountStatusCode } = resolveAccountStatus(
        u as {
          role?: string;
          isActive?: boolean;
          isActivated?: boolean;
          mustChangePassword?: boolean;
        }
      );
      return {
        ...u,
        accountStatus,
        accountStatusCode,
      };
    });

    const counts = {
      all: await User.countDocuments(),
      guru: await User.countDocuments({ role: "guru" }),
      siswa: await User.countDocuments({ role: "siswa" }),
      kurikulum: await User.countDocuments({ role: "kurikulum" }),
      kepsek: await User.countDocuments({ role: "kepsek" }),
      admin: await User.countDocuments({ role: "admin" }),
    };

    return NextResponse.json({ success: true, data: users, counts });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memuat pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      email,
      loginUsername,
      username,
      password,
      role,
      nip,
      nisn,
      phone,
      tahunBergabung,
    } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, message: "Nama, email, dan role wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan" },
        { status: 400 }
      );
    }

    if (nip && nip.trim()) {
      const existingNip = await User.findOne({ nip: nip.trim() });
      if (existingNip) {
        return NextResponse.json(
          { success: false, message: `NIP ${nip.trim()} sudah terdaftar` },
          { status: 400 }
        );
      }
    }

    let resolvedUsername: string | undefined;
    const needsActivation = isActivationRole(role);

    if (needsActivation) {
      const rawRequestedUsername =
        loginUsername !== undefined ? loginUsername : username;

      if (
        typeof rawRequestedUsername === "string" &&
        rawRequestedUsername.trim().length > 0
      ) {
        const validation = validateUsername(rawRequestedUsername);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, message: validation.message },
            { status: 400 }
          );
        }
        const available = await isUsernameAvailableForRole(
          validation.username,
          role
        );
        if (!available) {
          return NextResponse.json(
            {
              success: false,
              message: `Username sudah digunakan oleh akun ${role === "guru" ? "Guru" : "Kurikulum"} lain`,
            },
            { status: 400 }
          );
        }
        resolvedUsername = validation.username;
      } else {
        resolvedUsername = await generateInitialUsername({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          nip: nip ? nip.trim() : undefined,
          role,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password || "password123", 10);
    const parsedTahunBergabung = tahunBergabung
      ? String(tahunBergabung).trim()
      : new Date().getFullYear().toString();
    const parsedJoinYear =
      parseInt(parsedTahunBergabung, 10) || new Date().getFullYear();

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      loginUsername: resolvedUsername,
      isActivated: !needsActivation,
      mustChangePassword: needsActivation,
      activatedAt: null,
      nip: nip ? nip.trim() : undefined,
      nisn: nisn ? nisn.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      tahunBergabung: parsedTahunBergabung,
      joinYear: parsedJoinYear,
      isActive: true,
    });

    const userObj = user.toObject() as unknown as Record<string, unknown>;
    delete userObj.password;
    const { accountStatus, accountStatusCode } = resolveAccountStatus({
      role: user.role,
      isActive: user.isActive,
      isActivated: user.isActivated,
      mustChangePassword: user.mustChangePassword,
    });
    userObj.accountStatus = accountStatus;
    userObj.accountStatusCode = accountStatusCode;

    return NextResponse.json({ success: true, data: userObj }, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, NIP, atau username sudah digunakan",
        },
        { status: 400 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Gagal membuat pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
