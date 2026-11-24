import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  isActivationRole,
  requiresAccountActivation,
  setSessionCookie,
} from "@/lib/auth";
import {
  isUsernameAvailableForRole,
  validateUsername,
} from "@/lib/activation";
import { connectDB } from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";
import type { SessionUser } from "@/types";

const ALLOWED_ACTIVATE_KEYS = new Set([
  "username",
  "loginUsername",
  "newPassword",
  "password",
  "confirmPassword",
]);

const ID_TAMPER_KEYS = ["_id", "id", "userId", "teacherId", "studentId"];

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession({ allowUnactivated: true });
  if (error || !session) return error;

  if (!isActivationRole(session.role)) {
    return NextResponse.json(
      {
        success: false,
        message: "Aktivasi akun hanya berlaku untuk peran Guru dan Kurikulum",
      },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const candidate = url.searchParams.get("username");

  if (candidate !== null) {
    const validation = validateUsername(candidate);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    await connectDB();
    const available = await isUsernameAvailableForRole(
      validation.username,
      session.role,
      session.id
    );

    return NextResponse.json({
      success: true,
      available,
      username: validation.username,
      message: available
        ? "Username tersedia"
        : "Username sudah digunakan pada peran ini. Silakan pilih username lain.",
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      user: session,
      requiresActivation: requiresAccountActivation(session),
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession({ allowUnactivated: true });
  if (error || !session) return error;

  if (!isActivationRole(session.role)) {
    return NextResponse.json(
      {
        success: false,
        message: "Aktivasi akun hanya berlaku untuk peran Guru dan Kurikulum",
      },
      { status: 403 }
    );
  }

  // Reject any attempt to target another user via query parameters
  const url = new URL(req.url);
  for (const param of ID_TAMPER_KEYS) {
    const val = url.searchParams.get(param);
    if (val && String(val) !== String(session.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Tidak dapat mengaktivasi akun pengguna lain.",
        },
        { status: 403 }
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Format permintaan tidak valid" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "Data permintaan tidak valid" },
      { status: 400 }
    );
  }

  // Reject cross-user ID tampering in request body
  for (const idField of ID_TAMPER_KEYS) {
    if (
      body[idField] !== undefined &&
      String(body[idField]) !== String(session.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Tidak dapat mengaktivasi akun pengguna lain.",
        },
        { status: 403 }
      );
    }
  }

  // Strict field allowlist: reject any attempt to modify official biodata, role, or status
  const bodyKeys = Object.keys(body);
  const forbiddenKeys = bodyKeys.filter((k) => !ALLOWED_ACTIVATE_KEYS.has(k));
  if (forbiddenKeys.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: `Akses ditolak: Biodata resmi dan atribut sistem bersifat hanya-baca (${forbiddenKeys.join(", ")}).`,
      },
      { status: 403 }
    );
  }

  await connectDB();

  const user = await User.findById(session.id);
  if (!user || !user.isActive) {
    return NextResponse.json(
      { success: false, message: "Akun pengguna tidak ditemukan atau nonaktif" },
      { status: 404 }
    );
  }

  if (!isActivationRole(user.role)) {
    return NextResponse.json(
      {
        success: false,
        message: "Aktivasi akun hanya berlaku untuk peran Guru dan Kurikulum",
      },
      { status: 403 }
    );
  }

  // 1. Resolve and validate username
  const rawUsername =
    body.username !== undefined
      ? body.username
      : body.loginUsername !== undefined
        ? body.loginUsername
        : user.loginUsername;

  const usernameValidation = validateUsername(rawUsername);
  if (!usernameValidation.valid) {
    return NextResponse.json(
      { success: false, message: usernameValidation.message },
      { status: 400 }
    );
  }

  const normalizedUsername = usernameValidation.username;

  // 2. Verify role-scoped username availability
  const isAvailable = await isUsernameAvailableForRole(
    normalizedUsername,
    user.role,
    String(user._id)
  );
  if (!isAvailable) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Username sudah digunakan pada peran ini. Silakan pilih username lain.",
      },
      { status: 400 }
    );
  }

  // 3. Validate newPassword & confirmPassword
  const rawNewPassword =
    body.newPassword !== undefined ? body.newPassword : body.password;
  const newPassword =
    typeof rawNewPassword === "string" ? rawNewPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!newPassword) {
    return NextResponse.json(
      { success: false, message: "Password baru wajib diisi" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { success: false, message: "Password baru minimal harus 6 karakter" },
      { status: 400 }
    );
  }

  if (!confirmPassword) {
    return NextResponse.json(
      { success: false, message: "Konfirmasi password baru wajib diisi" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { success: false, message: "Konfirmasi password baru tidak cocok" },
      { status: 400 }
    );
  }

  // 4. Hash password & update activation state (official biodata remains untouched)
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const activatedAt = new Date();

  user.loginUsername = normalizedUsername;
  user.password = hashedPassword;
  user.isActivated = true;
  user.mustChangePassword = false;
  user.activatedAt = activatedAt;

  try {
    await user.save();
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
          message:
            "Username sudah digunakan pada peran ini. Silakan pilih username lain.",
        },
        { status: 400 }
      );
    }
    throw err;
  }

  // 5. Reissue JWT session cookie with updated activation claims
  const updatedSessionUser: SessionUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    loginUsername: user.loginUsername,
    isActivated: true,
    mustChangePassword: false,
    nip: user.nip,
  };

  const token = await createSessionToken(updatedSessionUser);
  await setSessionCookie(token);

  return NextResponse.json({
    success: true,
    message: "Akun berhasil diaktivasi",
    data: {
      user: updatedSessionUser,
      activatedAt: activatedAt.toISOString(),
    },
  });
}
