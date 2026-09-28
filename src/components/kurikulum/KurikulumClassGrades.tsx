"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  GraduationCap,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Printer,
  ChevronRight,
  TrendingUp,
  Inbox,
  Filter,
  Award,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface ClassOption {
  id: string;
  name: string;
  grade: string;
  academicYear: string;
  studentCount: number;
}

export interface StudentGradeRow {
  studentId: string;
  studentName: string;
  nis: string | null;
  average: number | null;
  assignmentAverage: number | null;
  quizAverage: number | null;
  academicProgress: number;
}

export interface ClassGradeSummary {
  average: number | null;
  distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  academicProgress: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  academicYear: string;
  totalStudents: number;
}

export interface KurikulumClassGradesData {
  classesList: ClassOption[];
  classInfo: ClassInfo | null;
  summary: ClassGradeSummary;
  students: StudentGradeRow[];
}

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getGradePredicate(avg: number | null): { label: string; badge: string } {
  if (avg === null) return { label: "-", badge: "bg-slate-100 text-slate-500 border-slate-200" };
  if (avg >= 85) return { label: "A", badge: "bg-emerald-50 text-emerald-700 border-emerald-200/70" };
  if (avg >= 75) return { label: "B", badge: "bg-blue-50 text-blue-700 border-blue-200/70" };
  if (avg >= 60) return { label: "C", badge: "bg-amber-50 text-amber-700 border-amber-200/70" };
  return { label: "D", badge: "bg-rose-50 text-rose-700 border-rose-200/70" };
}

export function KurikulumClassGrades() {
  const [data, setData] = useState<KurikulumClassGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2024/2025");
  const [searchQuery, setSearchQuery] = useState("");

  // Race condition guard
  const requestCounter = useRef(0);

  const fetchClassGrades = async (classId?: string, year?: string) => {
    const currentReq = ++requestCounter.current;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (year) params.set("academicYear", year);

      const res = await fetch(`/api/kurikulum/grades/classes?${params.toString()}`);
      const json = await res.json();

      // If a newer request has started, ignore this response
      if (currentReq !== requestCounter.current) return;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat monitoring nilai kelas");
      }

      setData(json.data);
      if (json.data.classInfo?.id && !selectedClassId) {
        setSelectedClassId(json.data.classInfo.id);
      }
    } catch (err: unknown) {
      if (currentReq === requestCounter.current) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
        setError(message);
      }
    } finally {
      if (currentReq === requestCounter.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClassGrades(selectedClassId || undefined, selectedYear);
  }, [selectedClassId, selectedYear]);

  // Filtered Students by search query
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.students;
    return data.students.filter((st) => {
      const matchName = st.studentName.toLowerCase().includes(q);
      const matchNis = st.nis ? st.nis.toLowerCase().includes(q) : false;
      return matchName || matchNis;
    });
  }, [data, searchQuery]);

  // Distribution calculations for stacked bar
  const distTotal = useMemo(() => {
    if (!data?.summary.distribution) return 0;
    const { A, B, C, D } = data.summary.distribution;
    return A + B + C + D;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Kurikulum</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Monitoring Nilai Kelas</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Monitoring Nilai Kelas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Tinjauan komprehensif performa akademik siswa per rombel kelas.
          </p>
        </div>

        {/* Top Controls: Class Selector, Year Selector, Print Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Select Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedClassId || data?.classInfo?.id || ""}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={loading && !data}
              aria-label="Pilih Rombel Kelas"
              className="h-9.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              {data?.classesList && data.classesList.length > 0 ? (
                data.classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentCount} Siswa)
                  </option>
                ))
              ) : (
                <option value="">Memuat Kelas...</option>
              )}
            </select>
          </div>

          {/* Academic Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={loading && !data}
            aria-label="Pilih Tahun Ajaran"
            className="h-9.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          >
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2023/2024">2023/2024</option>
          </select>

          {/* Non-Mutating Quick Action: Print */}
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Cetak monitoring nilai kelas"
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Printer className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={() => fetchClassGrades(selectedClassId || undefined, selectedYear)}
            disabled={loading}
            aria-label="Segarkan data nilai kelas"
            className="grid size-9.5 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
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
            <h2 className="font-semibold text-red-900">Data nilai kelas tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchClassGrades(selectedClassId || undefined, selectedYear)}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Class Summary Widgets (Matching Figma Screen 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Rata-Rata Kelas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-Rata Kelas
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Award className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-lg" />
            ) : data?.summary?.average !== null && data?.summary?.average !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                  {data.summary.average}
                </span>
                <span className="text-xs font-bold text-slate-400">/ 100</span>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-400 italic">
                Belum ada data nilai
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Rata-rata kumulatif nilai tugas &amp; kuis
            </p>
          </div>
        </div>

        {/* Card 2: LMS Academic Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Progress Akademik LMS
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-slate-200 animate-pulse rounded-lg" />
                <div className="h-2.5 w-full bg-slate-200 animate-pulse rounded-full" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {data?.summary?.academicProgress ?? 0}%
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    Selesai Dikerjakan
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${data?.summary?.academicProgress ?? 0}%` }}
                  />
                </div>
              </>
            )}
            <p className="mt-2 text-xs text-slate-500 font-medium">
              Penyelesaian pengumpulan tugas &amp; kuis
            </p>
          </div>
        </div>

        {/* Card 3: Distribusi Nilai Siswa */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Distribusi Nilai
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {data?.classInfo?.totalStudents ?? 0} Siswa
            </span>
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="h-10 w-full bg-slate-200 animate-pulse rounded-lg" />
            ) : (
              <>
                {/* 4 Predicates Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
                    <span className="text-[10px] font-bold text-emerald-700">A (&ge;85)</span>
                    <p className="mt-0.5 text-base font-extrabold text-emerald-800">
                      {data?.summary?.distribution?.A ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2">
                    <span className="text-[10px] font-bold text-blue-700">B (75-84)</span>
                    <p className="mt-0.5 text-base font-extrabold text-blue-800">
                      {data?.summary?.distribution?.B ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2">
                    <span className="text-[10px] font-bold text-amber-700">C (60-74)</span>
                    <p className="mt-0.5 text-base font-extrabold text-amber-800">
                      {data?.summary?.distribution?.C ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2">
                    <span className="text-[10px] font-bold text-rose-700">D (&lt;60)</span>
                    <p className="mt-0.5 text-base font-extrabold text-rose-800">
                      {data?.summary?.distribution?.D ?? 0}
                    </p>
                  </div>
                </div>

                {/* Stacked Proportional Bar */}
                {distTotal > 0 && (
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${((data?.summary?.distribution?.A ?? 0) / distTotal) * 100}%` }}
                      title={`A: ${data?.summary?.distribution?.A ?? 0}`}
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${((data?.summary?.distribution?.B ?? 0) / distTotal) * 100}%` }}
                      title={`B: ${data?.summary?.distribution?.B ?? 0}`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${((data?.summary?.distribution?.C ?? 0) / distTotal) * 100}%` }}
                      title={`C: ${data?.summary?.distribution?.C ?? 0}`}
                    />
                    <div
                      className="bg-rose-500"
                      style={{ width: `${((data?.summary?.distribution?.D ?? 0) / distTotal) * 100}%` }}
                      title={`D: ${data?.summary?.distribution?.D ?? 0}`}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Student Grade Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Nilai Siswa
            </h2>
            {data?.classInfo && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60">
                {data.classInfo.name}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {filteredStudents.length} Siswa
            </span>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau NIS..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5 sm:px-6 w-12 text-center">
                  No
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Nama Siswa
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Rata-Rata Tugas
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Rata-Rata Kuis
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Nilai Akhir
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Progress LMS
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Predikat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3.5 sm:px-6 text-center font-semibold text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-4 w-12 mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-4 w-12 mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-6 w-14 rounded-lg mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-5 w-8 rounded-md mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {searchQuery
                        ? "Tidak ada siswa yang sesuai pencarian"
                        : "Belum ada siswa di kelas ini"}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                      {searchQuery
                        ? "Coba sesuaikan kata kunci nama siswa atau NIS yang dicari."
                        : "Data nilai siswa akan otomatis tampil di sini saat aktivitas pembelajaran berjalan."}
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <Filter className="size-3 text-slate-400" />
                        Reset Pencarian
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const pred = getGradePredicate(st.average);
                  return (
                    <tr
                      key={st.studentId}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* No */}
                      <td className="px-4 py-3.5 sm:px-6 text-center font-semibold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Nama Siswa */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                            {getInitials(st.studentName)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {st.studentName}
                            </p>
                            <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                              {st.nis ? `NIS. ${st.nis}` : "NIS Belum terdata"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rata-Rata Tugas */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        {st.assignmentAverage !== null ? (
                          <span className="font-bold text-slate-800 text-xs">
                            {st.assignmentAverage}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Belum ada nilai
                          </span>
                        )}
                      </td>

                      {/* Rata-Rata Kuis */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        {st.quizAverage !== null ? (
                          <span className="font-bold text-slate-800 text-xs">
                            {st.quizAverage}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Belum ada nilai
                          </span>
                        )}
                      </td>

                      {/* Nilai Akhir / Rata-rata */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        {st.average !== null ? (
                          <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 border border-blue-200/60">
                            {st.average}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Belum ada nilai
                          </span>
                        )}
                      </td>

                      {/* Progress LMS */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${st.academicProgress}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700 text-[11px]">
                            {st.academicProgress}%
                          </span>
                        </div>
                      </td>

                      {/* Predikat */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold border ${pred.badge}`}
                        >
                          {pred.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
