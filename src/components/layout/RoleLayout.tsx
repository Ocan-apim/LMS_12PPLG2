import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_DASHBOARD } from "@/lib/roles";
import { RoleShell } from "@/components/layout/RoleShell";
import type { Role } from "@/types";

type RoleLayoutProps = {
  role: Role;
  allowedRoles?: Role[];
  children: ReactNode;
};

export async function RoleLayout({ role, allowedRoles, children }: RoleLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const validRoles = allowedRoles || [role];
  if (!validRoles.includes(session.role)) {
    redirect(ROLE_DASHBOARD[session.role]);
  }

  return <RoleShell role={session.role} user={session}>{children}</RoleShell>;
}
