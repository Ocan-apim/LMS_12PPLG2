"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CircleHelp, Menu, Search, X, Users, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/types";

type TopNavProps = {
  userName: string;
  roleLabel: string;
  role?: Role;
  onMenuClick?: () => void;
};

interface SearchResults {
  students: Array<{
    _id: string;
    name: string;
    nisn?: string;
    email: string;
    classId?: { _id: string; name: string; grade: string };
  }>;
  classes: Array<{
    _id: string;
    name: string;
    code?: string;
    grade?: string;
  }>;
  teachers: Array<{
    _id: string;
    name: string;
    nip?: string;
    email: string;
  }>;
}

export function TopNav({ userName, roleLabel, role, onMenuClick }: TopNavProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Gagal mencari data:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      setIsOpen(false);
      if (role === "admin") {
        router.push(`/admin/students?search=${encodeURIComponent(query.trim())}`);
      } else if (role === "guru") {
        router.push(`/guru/classes?search=${encodeURIComponent(query.trim())}`);
      } else if (role === "siswa") {
        router.push(`/siswa/courses?search=${encodeURIComponent(query.trim())}`);
      } else {
        router.push(`/${role || "admin"}?search=${encodeURIComponent(query.trim())}`);
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const hasResults =
    results &&
    (results.students.length > 0 ||
      results.classes.length > 0 ||
      results.teachers.length > 0);

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

      {/* Functional Search Bar */}
      <div ref={searchContainerRef} className="relative hidden max-w-[420px] flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() && hasResults) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari siswa, kelas, guru, atau NISN..."
          className="h-8.5 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="size-3.5" />
          </button>
        ) : null}

        {/* Live Search Dropdown */}
        {isOpen && query.trim() && (
          <div className="absolute left-0 top-full mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 text-xs text-slate-800 animate-in fade-in slide-in-from-top-1 max-h-96 overflow-y-auto">
            {!hasResults && !searching && (
              <p className="py-4 text-center text-slate-400">
                Tidak ada hasil ditemukan untuk &quot;{query}&quot;
              </p>
            )}

            {results?.classes && results.classes.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <GraduationCap className="size-3.5 text-blue-600" />
                  <span>Kelas Rombel</span>
                </div>
                <div className="space-y-1">
                  {results.classes.map((c) => (
                    <Link
                      key={c._id}
                      href={role === "admin" ? "/admin/classes" : `/guru/classes/${c._id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-slate-50 transition"
                    >
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      {c.grade && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          Tingkat {c.grade}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results?.students && results.students.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Users className="size-3.5 text-emerald-600" />
                  <span>Siswa</span>
                </div>
                <div className="space-y-1">
                  {results.students.map((st) => (
                    <Link
                      key={st._id}
                      href={role === "admin" ? `/admin/students?search=${encodeURIComponent(st.name)}` : "#"}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{st.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {st.nisn ? `NISN: ${st.nisn}` : st.email}
                        </p>
                      </div>
                      {st.classId?.name && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          {st.classId.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results?.teachers && results.teachers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <BookOpen className="size-3.5 text-purple-600" />
                  <span>Guru</span>
                </div>
                <div className="space-y-1">
                  {results.teachers.map((t) => (
                    <Link
                      key={t._id}
                      href={role === "admin" ? `/admin/teachers?search=${encodeURIComponent(t.name)}` : "#"}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{t.name}</p>
                        <p className="text-[10px] text-slate-400">{t.nip ? `NIP. ${t.nip}` : t.email}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 border-t border-slate-100 pt-2 text-center">
              <span className="text-[10px] text-slate-400">
                Tekan <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px]">Enter</kbd> untuk melihat semua hasil
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
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

        {/* Profile Section: Hidden for role === "admin" as requested! */}
        {role !== "admin" && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {userName || "Pengguna"}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {roleLabel || "Portal"}
              </p>
            </div>
            <div className="size-8 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center text-xs font-bold text-blue-700">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        )}
      </div>
      <span className="sr-only">{roleLabel}</span>
    </header>
  );
}
