"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role, SessionUser } from "@/types";
import { ROLE_LABELS } from "@/lib/roles";
import { AccountActivationModal } from "@/components/auth/AccountActivationModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

function checkRequiresActivation(user?: SessionUser | null): boolean {
  if (!user || (user.role !== "guru" && user.role !== "kurikulum")) {
    return false;
  }
  return user.isActivated === false || user.mustChangePassword === true;
}

type RoleShellProps = {
  role: Role;
  user: SessionUser;
  requiresActivation?: boolean;
  children: ReactNode;
};

export function RoleShell({
  role,
  user,
  requiresActivation,
  children,
}: RoleShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activatedUser, setActivatedUser] = useState<SessionUser | null>(null);

  const currentUser =
    activatedUser && activatedUser.id === user.id ? activatedUser : user;
  const isPendingActivation =
    activatedUser && activatedUser.id === user.id
      ? false
      : (requiresActivation ?? checkRequiresActivation(user));

  function handleActivated(updatedUser: SessionUser) {
    setActivatedUser(updatedUser);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#fbfbfd]">
      {isPendingActivation && (
        <AccountActivationModal
          user={currentUser}
          onActivated={handleActivated}
        />
      )}

      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex ${
          isPendingActivation
            ? "pointer-events-none select-none opacity-50 blur-[1px]"
            : ""
        }`}
        aria-hidden={isPendingActivation}
      >
        <Sidebar role={role} pathname={pathname} />
      </div>

      {sidebarOpen && !isPendingActivation ? (
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
        <div
          className={
            isPendingActivation
              ? "pointer-events-none select-none opacity-50 blur-[1px]"
              : ""
          }
          aria-hidden={isPendingActivation}
        >
          <TopNav
            userName={currentUser.name}
            roleLabel={ROLE_LABELS[role]}
            role={role}
            onMenuClick={() => {
              if (!isPendingActivation) setSidebarOpen(true);
            }}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-between">
          <div className="mx-auto w-full max-w-7xl">
            {isPendingActivation ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
                Menunggu penyelesaian aktivasi akun...
              </div>
            ) : (
              children
            )}
          </div>
          <footer className="mx-auto w-full max-w-7xl mt-12 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3 pb-6">
            <p>© 2026 Learnix LMS. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-600 transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-slate-600 transition">
                Terms of Service
              </a>
              <a href="#" className="hover:text-slate-600 transition">
                Contact Support
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
