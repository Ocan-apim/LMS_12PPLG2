import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ROLE_DASHBOARD } from "@/lib/roles";
import type { Role, SessionUser } from "@/types";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return { session: null as SessionUser | null, error: unauthorized() };
  }
  return { session, error: null };
}

export async function requireRole(roles: Role | Role[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const { session, error } = await requireSession();
  if (error || !session) {
    return { session: null as SessionUser | null, error: error ?? unauthorized() };
  }

  if (!allowed.includes(session.role)) {
    return {
      session,
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

export function redirectForRole(role: Role) {
  return ROLE_DASHBOARD[role];
}
