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
    <header className="sticky top-0 z-20 flex h-[42px] items-center justify-between gap-3 border-b border-[#e4e6ef] bg-white/95 px-3 backdrop-blur md:px-5">
      <Button
        type="button"
        variant="icon"
        aria-label="Buka navigasi"
        onClick={onMenuClick}
        className="size-8 lg:hidden"
      >
        <Menu className="size-4" />
      </Button>

      <div className="relative hidden max-w-[450px] flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          placeholder="Search events, classes..."
          className="h-8 w-full rounded-full border border-transparent bg-[#f8efff] pl-10 pr-4 text-xs outline-none transition focus:border-[#ded4ff] focus:ring-2 focus:ring-[#eee9ff]"
        />
      </div>

      <div className="ml-auto flex items-center gap-5">
        <button aria-label="Notifikasi" className="text-slate-600 transition hover:text-[#674ce7]">
          <Bell className="size-5" />
        </button>
        <button aria-label="Bantuan" className="text-slate-600 transition hover:text-[#674ce7]">
          <CircleHelp className="size-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-extrabold">{userName}</p>
            <p className="text-[10px] text-slate-500">12 PPLG 2</p>
          </div>
          <div className="size-8 rounded-full bg-[#151515]" />
        </div>
      </div>
      <span className="sr-only">{roleLabel}</span>
    </header>
  );
}
