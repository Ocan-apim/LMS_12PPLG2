import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    const query: Record<string, unknown> = {};

    if (role && role !== "all") {
      query.role = role;
    }
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { nip: { $regex: search, $options: "i" } },
        { nisn: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

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
    const message = err instanceof Error ? err.message : "Gagal memuat pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const { name, email, password, role, nip, nisn, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Nama, email, password, dan role wajib diisi" },
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      nip: nip ? nip.trim() : undefined,
      nisn: nisn ? nisn.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      isActive: true,
    });

    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({ success: true, data: userObj }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat pengguna";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
