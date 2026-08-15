"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Role, SessionUser } from "@/types";
import { ROLE_LABELS } from "@/lib/roles";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

type RoleShellProps = {
  role: Role;
  user: SessionUser;
  children: ReactNode;
};

export function RoleShell({ role, user, children }: RoleShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fbfbfd]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
        <Sidebar role={role} pathname={pathname} />
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full">
            <Sidebar
              role={role}
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[220px]">
        <TopNav
          userName={user.name}
          roleLabel={ROLE_LABELS[role]}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
