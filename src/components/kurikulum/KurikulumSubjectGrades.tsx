"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  BookOpen,
  Award,
  Search,
  RefreshCw,
  AlertCircle,
  Printer,
  ChevronRight,
  TrendingUp,
  Inbox,
  Filter,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface SubjectOption {
  id: string;
  name: string;
  code: string;
  category: string;
}

export interface ClassComparisonItem {
  classId: string;
  className: string;
  average: number | null;
}

export interface SubjectTrendPoint {
  period: string;
  average: number;
}

export interface SubjectComponents {
  assignmentAverage: number | null;
  quizAverage: number | null;
}

export interface ClassBreakdownItem {
  courseClassId: string;
  className: string;
  teacherName: string;
  assignmentAverage: number | null;
  quizAverage: number | null;
  finalAverage: number | null;
  status: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
  code: string;
  category: string;
}

export interface KurikulumSubjectGradesData {
  subjectsList: SubjectOption[];
  subjectInfo: SubjectInfo | null;
  overallAverage: number | null;
  classComparison: ClassComparisonItem[];
  trend: SubjectTrendPoint[];
  components: SubjectComponents;
  classesBreakdown: ClassBreakdownItem[];
}

function getInitials(name: string): string {
  if (!name) return "G";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatPeriodLabel(periodStr: string): string {
  try {
    // Format YYYY-MM
    const [year, month] = periodStr.split("-");
    if (!year || !month) return periodStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  } catch {
    return periodStr;
  }
}

export function KurikulumSubjectGrades() {
  const [data, setData] = useState<KurikulumSubjectGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2024/2025");
  const [searchQuery, setSearchQuery] = useState("");

  // Race condition guard
  const requestCounter = useRef(0);

  const fetchSubjectGrades = async (subjectId?: string, year?: string) => {
    const currentReq = ++requestCounter.current;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (subjectId) params.set("subjectId", subjectId);
      if (year) params.set("academicYear", year);

      const res = await fetch(`/api/kurikulum/grades/subjects?${params.toString()}`);
      const json = await res.json();

      if (currentReq !== requestCounter.current) return;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat monitoring nilai mata pelajaran");
      }

      setData(json.data);
      if (json.data.subjectInfo?.id && !selectedSubjectId) {
        setSelectedSubjectId(json.data.subjectInfo.id);
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
    fetchSubjectGrades(selectedSubjectId || undefined, selectedYear);
  }, [selectedSubjectId, selectedYear]);

  // Filtered breakdown table rows
  const filteredBreakdown = useMemo(() => {
    if (!data?.classesBreakdown) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.classesBreakdown;
    return data.classesBreakdown.filter((item) => {
      const matchClass = item.className.toLowerCase().includes(q);
      const matchTeacher = item.teacherName.toLowerCase().includes(q);
      return matchClass || matchTeacher;
    });
  }, [data, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Kurikulum</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Monitoring Nilai Mapel</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Monitoring Nilai Mata Pelajaran
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Tinjauan komprehensif performa akademik, perbandingan kelas, dan tren capaian per mapel.
          </p>
        </div>

        {/* Top Controls: Subject Selector, Year Selector, Print Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedSubjectId || data?.subjectInfo?.id || ""}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={loading && !data}
              aria-label="Pilih Mata Pelajaran"
              className="h-9.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              {data?.subjectsList && data.subjectsList.length > 0 ? (
                data.subjectsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || s.category})
                  </option>
                ))
              ) : (
                <option value="">Memuat Mata Pelajaran...</option>
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
            aria-label="Cetak monitoring nilai mata pelajaran"
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Printer className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={() => fetchSubjectGrades(selectedSubjectId || undefined, selectedYear)}
            disabled={loading}
            aria-label="Segarkan data nilai mata pelajaran"
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
            <h2 className="font-semibold text-red-900">Data nilai mata pelajaran tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchSubjectGrades(selectedSubjectId || undefined, selectedYear)}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Summary & Class Comparison Section (Matching Figma Screen 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Overall Average & Components Breakdown */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Rata-Rata Nilai Mapel
              </span>
              <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Award className="size-5" />
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="h-12 w-28 bg-slate-200 animate-pulse rounded-xl" />
              ) : data?.overallAverage !== null && data?.overallAverage !== undefined ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-slate-900">
                    {data.overallAverage}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ 100</span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-400 italic">
                  Belum ada nilai
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Rata-rata kumulatif seluruh kelas pengampu
              </p>
            </div>
          </div>

          {/* Components Breakdown: Tugas vs Kuis */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rata-Rata Tugas
              </span>
              <p className="mt-1 text-base font-extrabold text-blue-700">
                {data?.components?.assignmentAverage !== null && data?.components?.assignmentAverage !== undefined
                  ? data.components.assignmentAverage
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rata-Rata Kuis
              </span>
              <p className="mt-1 text-base font-extrabold text-purple-700">
                {data?.components?.quizAverage !== null && data?.components?.quizAverage !== undefined
                  ? data.components.quizAverage
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Class Comparison Visual Bars */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Perbandingan Nilai Antar Kelas
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Komparasi capaian nilai rata-rata rombel kelas untuk mata pelajaran ini
                </p>
              </div>
              <div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <Layers className="size-4" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                ))
              ) : data?.classComparison && data.classComparison.length > 0 ? (
                data.classComparison.map((item) => (
                  <div key={item.classId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {item.className}
                      </span>
                      {item.average !== null ? (
                        <span className="font-extrabold text-blue-700">
                          {item.average}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Belum ada nilai
                        </span>
                      )}
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${item.average !== null ? Math.min(100, item.average) : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Belum ada kelas rombel yang terhubung dengan mata pelajaran ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Chronological Trend Section (Figma Line Chart) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Tren Nilai Mata Pelajaran
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Grafik perkembangan rata-rata nilai kronologis berdasarkan periode pembelajaran
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
            <TrendingUp className="size-3.5" />
            <span>Tren Kronologis</span>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="h-36 w-full bg-slate-100 animate-pulse rounded-xl" />
          ) : data?.trend && data.trend.length > 0 ? (
            <div className="h-40 w-full">
              <svg viewBox="0 0 680 140" className="h-full w-full">
                {[20, 50, 80, 110].map((y) => (
                  <line key={y} x1="0" x2="680" y1={y} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                ))}
                {/* SVG Polyline */}
                <polyline
                  points={data.trend
                    .map((t, idx) => {
                      const x = (idx / Math.max(1, data.trend.length - 1)) * 620 + 30;
                      const y = 120 - (t.average / 100) * 90;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.trend.map((t, idx) => {
                  const x = (idx / Math.max(1, data.trend.length - 1)) * 620 + 30;
                  const y = 120 - (t.average / 100) * 90;
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      <text x={x} y="136" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="bold">
                        {formatPeriodLabel(t.period)} ({t.average})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="flex min-h-[140px] items-center justify-center text-xs text-slate-400 italic">
              Belum cukup data riwayat nilai untuk menampilkan grafik tren.
            </div>
          )}
        </div>
      </div>

      {/* 5. Classes Breakdown Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Rincian Komponen Penilaian Per Kelas
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {filteredBreakdown.length} Kelas
            </span>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas atau guru..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Kelas
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Guru Pengampu
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
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-4 w-32" />
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
                      <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {searchQuery
                        ? "Tidak ada kelas yang cocok dengan pencarian"
                        : "Belum ada data nilai untuk mata pelajaran ini"}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                      {searchQuery
                        ? "Coba sesuaikan kata kunci pencarian kelas atau nama guru."
                        : "Data rincian nilai kelas akan muncul secara otomatis saat aktivitas pembelajaran dinilai."}
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
                filteredBreakdown.map((row) => (
                  <tr
                    key={row.courseClassId}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Kelas */}
                    <td className="px-4 py-3.5 sm:px-6 font-bold text-slate-900">
                      {row.className}
                    </td>

                    {/* Guru Pengampu */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 border border-blue-200">
                          {getInitials(row.teacherName)}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {row.teacherName}
                        </span>
                      </div>
                    </td>

                    {/* Rata-Rata Tugas */}
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      {row.assignmentAverage !== null ? (
                        <span className="font-bold text-slate-800">
                          {row.assignmentAverage}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Belum ada nilai
                        </span>
                      )}
                    </td>

                    {/* Rata-Rata Kuis */}
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      {row.quizAverage !== null ? (
                        <span className="font-bold text-slate-800">
                          {row.quizAverage}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Belum ada nilai
                        </span>
                      )}
                    </td>

                    {/* Nilai Akhir */}
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      {row.finalAverage !== null ? (
                        <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 border border-blue-200/60">
                          {row.finalAverage}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Belum ada nilai
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          row.status === "Tuntas"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            : row.status === "Perlu Peningkatan"
                            ? "bg-amber-50 text-amber-700 border-amber-200/70"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
