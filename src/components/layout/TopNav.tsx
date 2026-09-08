"use client";

import { Bell, CircleHelp, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

type TopNavProps = {
  userName: string;
  roleLabel: string;
  onMenuClick?: () => void;
};

export function TopNav({ userName, roleLabel, onMenuClick }: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <Button
        type="button"
        variant="icon"
        aria-label="Buka navigasi"
        onClick={onMenuClick}
        className="size-8 lg:hidden"
      >
        <Menu className="size-4" />
      </Button>

      <div className="relative hidden max-w-[420px] flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search student or submission ID..."
          className="h-8.5 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button
          aria-label="Notifikasi"
          className="relative rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <Bell className="size-4.5" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-500" />
        </button>
        <button
          aria-label="Bantuan"
          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <CircleHelp className="size-4.5" />
        </button>
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{userName || "Bu Guru"}</p>
            <p className="text-[10px] text-slate-500 font-medium">Matematika</p>
          </div>
          <div className="size-8 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center text-xs font-bold text-blue-700">
            {userName ? userName.charAt(0).toUpperCase() : "G"}
          </div>
        </div>
      </div>
      <span className="sr-only">{roleLabel}</span>
    </header>
  );
}
