"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  BookOpen,
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  ChevronRight,
  Filter,
  GraduationCap,
  Inbox,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface KurikulumTeacher {
  id: string;
  name: string;
  nip: string | null;
  email: string;
  photoUrl: string | null;
  subjects: string[];
  teachingLoad: number;
  classCount: number;
  isActive: boolean;
}

function getInitials(name: string): string {
  if (!name) return "G";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function KurikulumTeachers() {
  const [teachers, setTeachers] = useState<KurikulumTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Detail Modal State
  const [selectedTeacher, setSelectedTeacher] = useState<KurikulumTeacher | null>(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/kurikulum/teachers");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data guru");
      }
      setTeachers(json.data.teachers || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data guru";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Compute unique subjects for filter dropdown
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      (t.subjects || []).forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [teachers]);

  // Summary Metrics
  const activeCount = useMemo(() => teachers.filter((t) => t.isActive).length, [teachers]);
  const totalSubjectsCount = useMemo(() => allSubjects.length, [allSubjects]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Status filter
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;

      // Subject filter
      if (subjectFilter !== "all" && !t.subjects.includes(subjectFilter)) {
        return false;
      }

      // Search query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const matchName = t.name.toLowerCase().includes(q);
      const matchNip = t.nip ? t.nip.toLowerCase().includes(q) : false;
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchSubject = t.subjects.some((s) => s.toLowerCase().includes(q));

      return matchName || matchNip || matchEmail || matchSubject;
    });
  }, [teachers, searchQuery, statusFilter, subjectFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Kurikulum</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Data Guru</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Data Guru
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Direktori tenaga pendidik, penugasan mata pelajaran, dan beban mengajar kelas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTeachers}
            disabled={loading}
            aria-label="Segarkan data guru"
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
            <h2 className="font-semibold text-red-900">Data guru tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchTeachers}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Summary Cards Section (Matching Figma Screen 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Guru */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Guru
            </span>
            {loading ? (
              <div className="mt-2 h-8 w-16 bg-slate-200 animate-pulse rounded-lg" />
            ) : (
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {teachers.length}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500 font-medium">Tenaga pendidik terdaftar</p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <Users className="size-6" />
          </div>
        </div>

        {/* Guru Aktif */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Guru Aktif
            </span>
            {loading ? (
              <div className="mt-2 h-8 w-16 bg-slate-200 animate-pulse rounded-lg" />
            ) : (
              <div className="mt-1 text-3xl font-extrabold text-emerald-600">
                {activeCount}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500 font-medium">Aktif mengajar semester ini</p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <UserCheck className="size-6" />
          </div>
        </div>

        {/* Total Mata Pelajaran */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mata Pelajaran
            </span>
            {loading ? (
              <div className="mt-2 h-8 w-16 bg-slate-200 animate-pulse rounded-lg" />
            ) : (
              <div className="mt-1 text-3xl font-extrabold text-purple-600">
                {totalSubjectsCount}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500 font-medium">Mapel diampu pengajar</p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-purple-50 text-purple-600">
            <BookOpen className="size-6" />
          </div>
        </div>
      </div>

      {/* 4. Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, email, atau mapel..."
              className="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="size-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter status guru"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>

            {/* Subject Filter */}
            {allSubjects.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                aria-label="Filter mata pelajaran"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua Mata Pelajaran</option>
                {allSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}

            {(searchQuery || statusFilter !== "all" || subjectFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSubjectFilter("all");
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Guru
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  NIP
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Mata Pelajaran
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Beban Mengajar
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Status
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-right">
                      <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {searchQuery || statusFilter !== "all" || subjectFilter !== "all"
                        ? "Tidak ada data guru yang cocok"
                        : "Belum ada data guru"}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                      {searchQuery || statusFilter !== "all" || subjectFilter !== "all"
                        ? "Coba ubah kata kunci pencarian atau sesuaikan opsi filter status dan mata pelajaran."
                        : "Data pengajar akan muncul di sini setelah didaftarkan ke sistem."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Column 1: Guru */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 border border-blue-200">
                          {getInitials(t.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {t.name}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                            {t.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: NIP */}
                    <td className="px-4 py-3.5 sm:px-6 font-mono text-slate-600">
                      {t.nip ? t.nip : <span className="text-slate-400 italic">Belum ada NIP</span>}
                    </td>

                    {/* Column 3: Mata Pelajaran */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                        {t.subjects && t.subjects.length > 0 ? (
                          t.subjects.map((sub) => (
                            <span
                              key={sub}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200/60"
                            >
                              <BookOpen className="size-2.5 text-purple-500" />
                              {sub}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                        )}
                      </div>
                    </td>

                    {/* Column 4: Beban Mengajar */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="size-3.5 text-blue-600" />
                        <span className="font-bold text-slate-800">
                          {t.teachingLoad}
                        </span>
                        <span className="text-slate-500 font-medium text-[11px]">
                          Kelas Aktif
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Status */}
                    <td className="px-4 py-3.5 sm:px-6">
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="size-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                          <XCircle className="size-3" />
                          Tidak Aktif
                        </span>
                      )}
                    </td>

                    {/* Column 6: Aksi (Read-Only Detail) */}
                    <td className="px-4 py-3.5 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTeacher(t)}
                        title="Lihat Detail Guru"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                      >
                        <Eye className="size-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Read-Only Teacher Detail Modal */}
      {selectedTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-blue-100 text-sm font-bold text-blue-700 border border-blue-200">
                  {getInitials(selectedTeacher.name)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedTeacher.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tenaga Pendidik / Guru Mata Pelajaran
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                aria-label="Tutup detail guru"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nomor Induk Pegawai (NIP)
                  </span>
                  <p className="mt-1 font-mono font-semibold text-slate-800 text-sm">
                    {selectedTeacher.nip || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status Keaktifan
                  </span>
                  <div className="mt-1">
                    {selectedTeacher.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="size-3.5" />
                        Aktif Mengajar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-bold">
                        <XCircle className="size-3.5" />
                        Tidak Aktif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email Akun LMS
                </span>
                <p className="mt-1 font-semibold text-slate-800 text-sm">
                  {selectedTeacher.email}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Beban Mengajar &amp; Kelas Aktif
                </span>
                <p className="mt-1 font-semibold text-slate-800 text-sm">
                  {selectedTeacher.teachingLoad} Kelas Rombel Aktif diampu
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mata Pelajaran yang Diampu
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 ? (
                    selectedTeacher.subjects.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200/60"
                      >
                        <BookOpen className="size-3 text-purple-500" />
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Belum ada mata pelajaran terhubung.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
