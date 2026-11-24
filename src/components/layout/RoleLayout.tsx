import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requiresAccountActivation } from "@/lib/auth";
import { ROLE_DASHBOARD } from "@/lib/roles";
import { requireSession } from "@/lib/session";
import { RoleShell } from "@/components/layout/RoleShell";
import type { Role } from "@/types";

type RoleLayoutProps = {
  role: Role;
  allowedRoles?: Role[];
  children: ReactNode;
};

export async function RoleLayout({
  role,
  allowedRoles,
  children,
}: RoleLayoutProps) {
  const { session } = await requireSession({ allowUnactivated: true });

  if (!session) {
    redirect("/login");
  }

  const validRoles = allowedRoles || [role];
  if (!validRoles.includes(session.role)) {
    redirect(ROLE_DASHBOARD[session.role]);
  }

  const requiresActivation = requiresAccountActivation(session);

  return (
    <RoleShell
      role={session.role}
      user={session}
      requiresActivation={requiresActivation}
    >
      {requiresActivation ? null : children}
    </RoleShell>
  );
}
