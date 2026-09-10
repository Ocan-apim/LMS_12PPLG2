import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { redirectForRole } from "@/lib/session";
import { User } from "@/models/User";
import type { SessionUser } from "@/types";

const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  nis: z.string().optional(),
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
      parsed.data.nis ||
      parsed.data.identifier ||
      parsed.data.email ||
      ""
    ).trim();
    const requestedRole = parsed.data.role?.toLowerCase()?.trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        {
          success: false,
          message: requestedRole === "siswa" ? "NIS wajib diisi" : "Email atau NIS wajib diisi",
        },
        { status: 400 }
      );
    }

    await connectDB();

    let query: Record<string, unknown> = { isActive: true };

    if (requestedRole === "siswa") {
      query = {
        role: "siswa",
        isActive: true,
        $or: [
          { nis: rawIdentifier },
          { nisn: rawIdentifier },
          { email: rawIdentifier.toLowerCase() },
        ],
      };
    } else if (requestedRole) {
      query = {
        role: requestedRole,
        isActive: true,
        $or: [
          { email: rawIdentifier.toLowerCase() },
          { nip: rawIdentifier },
        ],
      };
    } else {
      // General login: support email, nis, nisn, or nip
      query = {
        isActive: true,
        $or: [
          { email: rawIdentifier.toLowerCase() },
          { nis: rawIdentifier },
          { nisn: rawIdentifier },
          { nip: rawIdentifier },
        ],
      };
    }

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            requestedRole === "siswa"
              ? "NIS tidak ditemukan atau akun siswa belum aktif"
              : "Email atau password salah",
        },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message:
            requestedRole === "siswa" || user.role === "siswa"
              ? "NIS atau password salah"
              : "Email atau password salah",
        },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email || `${user.nis || user.nisn || user._id}@siswa.smk.sch.id`,
      role: user.role,
      nis: user.nis,
      nisn: user.nisn,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      data: {
        user: sessionUser,
        redirectTo: redirectForRole(user.role),
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
