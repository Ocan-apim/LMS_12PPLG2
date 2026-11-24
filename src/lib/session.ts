import { NextResponse } from "next/server";
import { getSession, requiresAccountActivation } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ROLE_DASHBOARD } from "@/lib/roles";
import { User } from "@/models/User";
import type { Role, SessionUser } from "@/types";

export type SessionResult =
  | { session: SessionUser; error: null }
  | { session: null; error: NextResponse };

export type SessionOptions = {
  allowUnactivated?: boolean;
};

export async function requireSession(
  options?: SessionOptions
): Promise<SessionResult> {
  const tokenSession = await getSession();
  if (!tokenSession) {
    return { session: null, error: unauthorized() };
  }

  try {
    await connectDB();
    const dbUser = (await User.findById(tokenSession.id)
      .select(
        "name email role loginUsername isActivated mustChangePassword isActive nis nisn nip"
      )
      .lean()) as {
      _id: unknown;
      name: string;
      email?: string;
      role: Role;
      loginUsername?: string;
      isActivated?: boolean;
      mustChangePassword?: boolean;
      isActive?: boolean;
      nis?: string;
      nisn?: string;
      nip?: string;
    } | null;

    if (!dbUser || dbUser.isActive === false) {
      return { session: null, error: unauthorized() };
    }

    const session: SessionUser = {
      id: String(dbUser._id),
      name: dbUser.name,
      email: dbUser.email || tokenSession.email,
      role: dbUser.role as Role,
      loginUsername: dbUser.loginUsername,
      isActivated: dbUser.isActivated !== false,
      mustChangePassword: Boolean(dbUser.mustChangePassword),
      nis: dbUser.nis,
      nisn: dbUser.nisn,
      nip: dbUser.nip,
    };

    if (!options?.allowUnactivated && requiresAccountActivation(session)) {
      return {
        session: null,
        error: activationRequiredResponse(),
      };
    }

    return { session, error: null };
  } catch {
    if (!options?.allowUnactivated && requiresAccountActivation(tokenSession)) {
      return {
        session: null,
        error: activationRequiredResponse(),
      };
    }
    return { session: tokenSession, error: null };
  }
}

export async function requireRole(
  roles: Role | Role[],
  options?: SessionOptions
): Promise<SessionResult> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const { session, error } = await requireSession(options);
  if (error || !session) {
    return { session: null, error: error ?? unauthorized() };
  }

  if (!allowed.includes(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );
}

export function activationRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      code: "ACTIVATION_REQUIRED",
      requiresActivation: true,
      message:
        "Akun Anda belum diaktivasi. Silakan selesaikan aktivasi akun terlebih dahulu.",
    },
    { status: 403 }
  );
}

export function redirectForRole(role: Role) {
  return ROLE_DASHBOARD[role];
}
