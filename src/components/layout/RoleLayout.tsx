import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_DASHBOARD } from "@/lib/roles";
import { RoleShell } from "@/components/layout/RoleShell";
import type { Role } from "@/types";

type RoleLayoutProps = {
  role: Role;
  children: ReactNode;
};

export async function RoleLayout({ role, children }: RoleLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== role) {
    redirect(ROLE_DASHBOARD[session.role]);
  }

  return <RoleShell role={role} user={session}>{children}</RoleShell>;
}
