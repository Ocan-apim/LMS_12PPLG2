"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  Folder,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Star,
  Upload,
  Users,
  BarChart3,
  HelpCircle,
  Layers,
  BookMarked,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { Role } from "@/types";
import type { NavIcon } from "@/lib/navigation";
import { ROLE_NAV } from "@/lib/roles";

const iconMap: Record<
  NavIcon,
  React.ComponentType<{ className?: string }>
> = {
  dashboard: LayoutDashboard,
  users: Users,
  classes: GraduationCap,
  students: UserCheck,
  departments: Layers,
  materials: Folder,
  assignments: ClipboardList,
  subjects: BookOpen,
  academic: BookMarked,
  syllabus: FileText,
  reports: BarChart3,
  overview: BarChart3,
  teachers: Users,
  courses: GraduationCap,
  grades: Star,
  quiz: HelpCircle,
  import: Upload,
  settings: Settings,
  schedule: Calendar,
  curriculum: FileText,
};

type SidebarProps = {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
};

export function Sidebar({ role, pathname, onNavigate }: SidebarProps) {
  const items = ROLE_NAV[role];
  const router = useRouter();

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of items) {
      if (item.children) {
        const isChildActive = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href)
        );
        // Default to open if child route is active or by default open
        initial[item.label] = isChildActive || true;
      }
    }
    return initial;
  });

  function toggleMenu(label: string) {
    setExpandedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-[#e4e6ef] bg-white text-[#141821]">
      <div className="flex h-[62px] items-center gap-3 border-b border-slate-200 px-4">
        <div className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
          <GraduationCap className="size-5" />
        </div>
        <div>
          <h1 className="font-sans text-lg font-bold leading-5 text-slate-900">
            Learnix
          </h1>
          <p className="text-[11px] font-medium text-slate-500">Portal Akademik</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || Users;

          // If item has children (Collapsible Parent Navlink)
          if (item.children && item.children.length > 0) {
            const isChildActive = item.children.some(
              (c) => pathname === c.href || pathname.startsWith(c.href)
            );
            const isOpen = Boolean(expandedMenus[item.label]);

            return (
              <div key={item.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={`flex h-10 w-full items-center justify-between border-l-4 px-4 text-xs font-semibold transition duration-200 ${
                    isChildActive
                      ? "border-blue-600 bg-blue-50/50 text-blue-700"
                      : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 shrink-0 text-blue-600" />
                    <span>{item.label}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="size-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="size-3.5 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-0.5 py-1 bg-slate-50/60 border-l-2 border-slate-200 ml-5 pl-2 my-0.5 animate-in slide-in-from-top-1 duration-150">
                    {item.children.map((child) => {
                      const ChildIcon = iconMap[child.icon] || Users;
                      const active =
                        pathname === child.href ||
                        (child.href !== `/${role}` && pathname.startsWith(child.href));

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[11px] font-semibold transition duration-150 ${
                            active
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                          }`}
                        >
                          <ChildIcon className="size-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex h-10 items-center gap-3 border-l-4 px-4 text-xs font-semibold transition duration-200 ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 space-y-1.5">
        {role === "guru" && (
          <Link
            href="/guru/classes/new"
            onClick={onNavigate}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition mb-2"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Buat Kelas Baru</span>
          </Link>
        )}
        {role === "guru" && (
          <>
            <Link
              href="/guru/settings"
              onClick={onNavigate}
              className={`flex h-8 w-full items-center gap-3 px-2 rounded-lg text-left text-xs font-medium transition ${
                pathname === "/guru/settings"
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Settings className="size-4 text-slate-500" />
              Pengaturan
            </Link>
            <button
              type="button"
              onClick={() => alert("Pusat Bantuan Learnix: Silakan hubungi admin sekolah di admin@learnix.sch.id atau telepon (021) 888-9999")}
              className="flex h-8 w-full items-center gap-3 px-2 rounded-lg text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <HelpCircle className="size-4 text-slate-500" />
              Bantuan
            </button>
          </>
        )}
        <div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-8 w-full items-center gap-3 px-2 rounded-lg text-left text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="size-4 text-slate-500" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
