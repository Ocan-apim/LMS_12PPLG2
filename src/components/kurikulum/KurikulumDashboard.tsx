"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  FileSpreadsheet,
  ChevronRight,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Inbox,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface KurikulumActivity {
  id: string;
  type: "assignment" | "quiz" | "material" | "post";
  title: string;
  teacherName: string;
  courseClassName: string;
  subjectName: string;
  createdAt: string;
}

export interface KurikulumDashboardData {
  totalActiveClasses: number;
  totalStudents: number;
  totalTeachers: number;
  totalSubjects: number;
  recentActivities: KurikulumActivity[];
}

const ACTIVITY_CONFIG: Record<
  KurikulumActivity["type"],
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  assignment: {
    label: "Tugas",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-600",
    border: "border-blue-200/70",
  },
  quiz: {
    label: "Kuis",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-600",
    border: "border-purple-200/70",
  },
  material: {
    label: "Materi",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-600",
    border: "border-emerald-200/70",
  },
  post: {
    label: "Diskusi",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-600",
    border: "border-amber-200/70",
  },
};

function formatActivityDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function getInitials(name: string): string {
  if (!name) return "G";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function KurikulumDashboard() {
  const [data, setData] = useState<KurikulumDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeType, setActiveType] = useState<"all" | KurikulumActivity["type"]>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/kurikulum/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data dashboard");
      }
      setData(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    if (!data?.recentActivities) return [];
    return data.recentActivities.filter((act) => {
      const matchesType = activeType === "all" || act.type === activeType;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        act.title.toLowerCase().includes(q) ||
        act.teacherName.toLowerCase().includes(q) ||
        act.courseClassName.toLowerCase().includes(q) ||
        act.subjectName.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [data, activeType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Kurikulum</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Monitoring Aktivitas Akademik</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Monitoring Aktivitas Akademik
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Pantau efektivitas pembelajaran dan aktivitas guru secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            aria-label="Segarkan data dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* 2. Error State */}
      {error && !loading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">Data dashboard tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
        {/* Card 1: Featured Primary Card - Kelas Aktif (Figma Style) */}
        <div className="xl:col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-sm flex flex-col justify-between min-h-[175px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Kelas Aktif
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                <Sparkles className="size-2.5" />
                Live LMS
              </span>
            </div>
            <div className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur-xs text-white">
              <GraduationCap className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading || !data ? (
              <div className="h-10 w-24 bg-white/20 animate-pulse rounded-xl" />
            ) : (
              <div className="text-4xl font-extrabold tracking-tight">
                {data.totalActiveClasses}
              </div>
            )}
            <p className="mt-1 text-xs text-blue-100/90 font-medium">
              Kelas rombel aktif terdaftar di sistem LMS
            </p>
          </div>
        </div>

        {/* Center Column: 3 Metric Cards */}
        <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3.5">
          {/* Total Siswa */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Siswa
              </span>
              {loading || !data ? (
                <div className="mt-2 h-7 w-16 bg-slate-200 animate-pulse rounded-lg" />
              ) : (
                <div className="mt-1 text-2xl font-extrabold text-slate-900">
                  {data.totalStudents}
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-medium">
                Siswa aktif di seluruh kelas
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="size-5" />
            </div>
          </div>

          {/* Total Guru & Total Mapel (Stacked or Grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Guru
                </span>
                <div className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
                  <UserCheck className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                {loading || !data ? (
                  <div className="h-6 w-12 bg-slate-200 animate-pulse rounded-md" />
                ) : (
                  <div className="text-xl font-extrabold text-slate-900">
                    {data.totalTeachers}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 font-medium">Tenaga pendidik</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mapel
                </span>
                <div className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <BookOpen className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                {loading || !data ? (
                  <div className="h-6 w-12 bg-slate-200 animate-pulse rounded-md" />
                ) : (
                  <div className="text-xl font-extrabold text-slate-900">
                    {data.totalSubjects}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 font-medium">Mata pelajaran</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Unduh Laporan Nilai (Figma Right Card) */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Unduh Laporan Nilai</h2>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="size-4" />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Akses cepat pratinjau, berkas rapor, dan arsip dokumen
            </p>
          </div>

          <div className="mt-3.5 divide-y divide-slate-100 text-xs font-semibold">
            <Link
              href="/kurikulum/reports"
              className="flex items-center justify-between py-2.5 text-slate-700 hover:text-blue-600 transition group"
            >
              <span>Pratinjau Nilai Siswa</span>
              <ChevronRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-blue-600 transition" />
            </Link>
            <Link
              href="/kurikulum/reports/recap"
              className="flex items-center justify-between py-2.5 text-slate-700 hover:text-blue-600 transition group"
            >
              <span>Cetak Rapor Rombel</span>
              <ChevronRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-blue-600 transition" />
            </Link>
            <Link
              href="/kurikulum/files"
              className="flex items-center justify-between py-2.5 text-slate-700 hover:text-blue-600 transition group"
            >
              <span>Arsip Dokumen Akademik</span>
              <ChevronRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-blue-600 transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Aktivitas Guru Terbaru Section (Figma Table/Feed) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Card Header & Filters */}
        <div className="p-4 sm:p-6 border-b border-slate-200/90 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Aktivitas Guru Terbaru
              </h2>
              {data && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {filteredActivities.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Log aktivitas pembelajaran, materi, tugas, dan kuis yang dibuat guru secara real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari guru, judul, kelas..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto">
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "assignment", label: "Tugas" },
                  { id: "quiz", label: "Kuis" },
                  { id: "material", label: "Materi" },
                  { id: "post", label: "Diskusi" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveType(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                    activeType === tab.id
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card Body / Table */}
        {loading ? (
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-28 hidden md:block" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          /* Empty State */
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Inbox className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery || activeType !== "all"
                ? "Tidak ada aktivitas yang sesuai filter"
                : "Belum ada aktivitas akademik terbaru"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery || activeType !== "all"
                ? "Coba ubah kata kunci pencarian atau pilih kategori jenis aktivitas lain."
                : "Aktivitas tugas, materi, kuis, dan postingan guru akan muncul secara otomatis di sini."}
            </p>
            {(searchQuery || activeType !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveType("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <Filter className="size-3 text-slate-400" />
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3.5 sm:px-6">
                    Guru &amp; Kelas
                  </th>
                  <th scope="col" className="px-4 py-3.5 sm:px-6">
                    Mata Pelajaran
                  </th>
                  <th scope="col" className="px-4 py-3.5 sm:px-6">
                    Jenis Aktivitas
                  </th>
                  <th scope="col" className="px-4 py-3.5 sm:px-6">
                    Rincian &amp; Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.map((act) => {
                  const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.assignment;
                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* Column 1: Guru & Kelas */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 border border-blue-200">
                            {getInitials(act.teacherName)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {act.teacherName}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                              {act.courseClassName}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Mata Pelajaran */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {act.subjectName}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Jenis Aktivitas Badge */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Column 4: Rincian Judul & Waktu */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="max-w-md">
                          <p className="font-semibold text-slate-900 line-clamp-1">
                            {act.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock className="size-3 shrink-0" />
                            <span>{formatActivityDate(act.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
