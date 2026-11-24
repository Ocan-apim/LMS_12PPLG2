import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import {
  createSessionToken,
  isActivationRole,
  requiresAccountActivation,
  setSessionCookie,
} from "@/lib/auth";
import { escapeRegex } from "@/lib/activation";
import { redirectForRole } from "@/lib/session";
import { User } from "@/models/User";
import type { SessionUser } from "@/types";

const loginSchema = z.object({
  identifier: z.string().optional(),
  username: z.string().optional(),
  email: z.string().optional(),
  nis: z.string().optional(),
  nip: z.string().optional(),
  password: z.string().min(1, "Password wajib diisi"),
  role: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Kredensial login tidak valid" },
        { status: 400 }
      );
    }

    const { password } = parsed.data;
    const rawIdentifier = (
      parsed.data.username ||
      parsed.data.nis ||
      parsed.data.identifier ||
      parsed.data.email ||
      parsed.data.nip ||
      ""
    ).trim();
    const requestedRole = parsed.data.role?.toLowerCase()?.trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        {
          success: false,
          message:
            requestedRole === "siswa"
              ? "NIS wajib diisi"
              : requestedRole === "guru" || requestedRole === "kurikulum"
                ? "Username wajib diisi"
                : "Email atau username wajib diisi",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const cleanNip = rawIdentifier.replace(/\s+/g, "");
    const lowerIdentifier = rawIdentifier.toLowerCase();
    const exactUsernameRegex = new RegExp(
      `^${escapeRegex(lowerIdentifier)}$`,
      "i"
    );

    let authenticatedUser: {
      _id: { toString(): string };
      name: string;
      email?: string;
      role: SessionUser["role"];
      loginUsername?: string;
      isActivated?: boolean;
      mustChangePassword?: boolean;
      activatedAt?: Date | null;
      nis?: string;
      nisn?: string;
      nip?: string;
    } | null = null;
    let blockedActivatedIdentifier = false;

    if (requestedRole === "siswa") {
      const candidates = await User.find({
        role: "siswa",
        isActive: true,
        $or: [
          { nis: rawIdentifier },
          { nisn: rawIdentifier },
          { email: lowerIdentifier },
        ],
      });

      if (candidates.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "NIS tidak ditemukan atau akun siswa belum aktif",
          },
          { status: 401 }
        );
      }

      for (const candidate of candidates) {
        if (await bcrypt.compare(password, candidate.password)) {
          authenticatedUser = candidate;
          break;
        }
      }

      if (!authenticatedUser) {
        return NextResponse.json(
          { success: false, message: "NIS atau password salah" },
          { status: 401 }
        );
      }
    } else if (requestedRole === "guru" || requestedRole === "kurikulum") {
      // 1. Primary lookup by customized / assigned loginUsername (case-insensitive)
      const byUsername = await User.findOne({
        role: requestedRole,
        isActive: true,
        loginUsername: exactUsernameRegex,
      });

      if (byUsername) {
        const valid = await bcrypt.compare(password, byUsername.password);
        if (!valid) {
          return NextResponse.json(
            { success: false, message: "Username atau password salah" },
            { status: 401 }
          );
        }
        authenticatedUser = byUsername;
      } else {
        // 2. Fallback lookup by initial credentials (email or NIP)
        const nipConditions: Record<string, unknown>[] = [
          { email: lowerIdentifier },
          { nip: rawIdentifier },
        ];
        if (cleanNip) {
          nipConditions.push({ nip: cleanNip });
          nipConditions.push({
            nip: {
              $regex: `^${cleanNip.split("").map(escapeRegex).join("\\s*")}$`,
              $options: "i",
            },
          });
        }

        const fallbackUser = await User.findOne({
          role: requestedRole,
          isActive: true,
          $or: nipConditions,
        });

        if (!fallbackUser) {
          return NextResponse.json(
            {
              success: false,
              message: "Username atau password salah",
            },
            { status: 401 }
          );
        }

        // Check if this account has already completed the first-login activation workflow
        const isStrictlyActivated =
          fallbackUser.isActivated !== false &&
          !fallbackUser.mustChangePassword &&
          Boolean(fallbackUser.activatedAt);

        if (isStrictlyActivated) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Akun sudah diaktivasi. Silakan login menggunakan username dan password Anda.",
            },
            { status: 401 }
          );
        }

        const valid = await bcrypt.compare(password, fallbackUser.password);
        if (!valid) {
          return NextResponse.json(
            { success: false, message: "Username atau password salah" },
            { status: 401 }
          );
        }

        authenticatedUser = fallbackUser;
      }
    } else if (requestedRole) {
      // Admin or Kepsek
      const user = await User.findOne({
        role: requestedRole,
        isActive: true,
        $or: [
          { email: lowerIdentifier },
          { nip: rawIdentifier },
          { nip: cleanNip },
        ],
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Email atau password salah" },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json(
          { success: false, message: "Email atau password salah" },
          { status: 401 }
        );
      }

      authenticatedUser = user;
    } else {
      // General login (no role specified in payload)
      const nipOrGeneralConditions: Record<string, unknown>[] = [
        { loginUsername: exactUsernameRegex },
        { email: lowerIdentifier },
        { nis: rawIdentifier },
        { nisn: rawIdentifier },
        { nip: rawIdentifier },
      ];
      if (cleanNip) {
        nipOrGeneralConditions.push({ nip: cleanNip });
        nipOrGeneralConditions.push({
          nip: {
            $regex: `^${cleanNip.split("").map(escapeRegex).join("\\s*")}$`,
            $options: "i",
          },
        });
      }

      const candidates = await User.find({
        isActive: true,
        $or: nipOrGeneralConditions,
      });

      if (candidates.length === 0) {
        return NextResponse.json(
          { success: false, message: "Username/Email atau password salah" },
          { status: 401 }
        );
      }

      for (const candidate of candidates) {
        if (isActivationRole(candidate.role)) {
          const matchedByUsername =
            typeof candidate.loginUsername === "string" &&
            candidate.loginUsername.toLowerCase() === lowerIdentifier;
          const isStrictlyActivated =
            candidate.isActivated !== false &&
            !candidate.mustChangePassword &&
            Boolean(candidate.activatedAt);

          if (!matchedByUsername && isStrictlyActivated) {
            blockedActivatedIdentifier = true;
            continue;
          }
        }

        if (await bcrypt.compare(password, candidate.password)) {
          authenticatedUser = candidate;
          break;
        }
      }

      if (!authenticatedUser) {
        if (blockedActivatedIdentifier) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Akun sudah diaktivasi. Silakan login menggunakan username dan password Anda.",
            },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { success: false, message: "Username/Email atau password salah" },
          { status: 401 }
        );
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, message: "Username/Email atau password salah" },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: authenticatedUser._id.toString(),
      name: authenticatedUser.name,
      email:
        authenticatedUser.email ||
        `${authenticatedUser.nis || authenticatedUser.nisn || authenticatedUser._id}@siswa.smk.sch.id`,
      role: authenticatedUser.role,
      loginUsername: authenticatedUser.loginUsername,
      isActivated: authenticatedUser.isActivated !== false,
      mustChangePassword: Boolean(authenticatedUser.mustChangePassword),
      nis: authenticatedUser.nis,
      nisn: authenticatedUser.nisn,
      nip: authenticatedUser.nip,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      data: {
        user: sessionUser,
        requiresActivation: requiresAccountActivation(sessionUser),
        redirectTo: redirectForRole(authenticatedUser.role),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
