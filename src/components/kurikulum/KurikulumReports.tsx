"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  Search,
  RefreshCw,
  AlertCircle,
  Filter,
  ChevronRight,
  Award,
  BookOpen,
  Users,
  GraduationCap,
  Inbox,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface ReportRowItem {
  studentId: string;
  studentName: string;
  nis: string | null;
  className: string;
  subjectName: string;
  teacherName: string;
  assignmentAverage: number | null;
  quizAverage: number | null;
  finalAverage: number | null;
}

export interface OptionItem {
  id: string;
  name: string;
  code?: string;
}

function getPredicate(score: number | null): string {
  if (score === null || score === undefined) return "-";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function KurikulumReports() {
  const [rows, setRows] = useState<ReportRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter option states
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [teachers, setTeachers] = useState<OptionItem[]>([]);

  // Selected filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedYear, setSelectedYear] = useState("2024/2025");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Race condition guard
  const requestCounter = useRef(0);

  // Fetch filter options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [subRes, clsRes, tchRes] = await Promise.all([
          fetch("/api/kurikulum/grades/subjects"),
          fetch("/api/kurikulum/grades/classes"),
          fetch("/api/kurikulum/teachers"),
        ]);

        if (subRes.ok) {
          const json = await subRes.json();
          if (json.success && Array.isArray(json.data?.subjectsList)) {
            setSubjects(json.data.subjectsList);
          }
        }
        if (clsRes.ok) {
          const json = await clsRes.json();
          if (json.success && Array.isArray(json.data?.classesList)) {
            setClasses(json.data.classesList);
          }
        }
        if (tchRes.ok) {
          const json = await tchRes.json();
          if (json.success && Array.isArray(json.data?.teachers)) {
            setTeachers(json.data.teachers);
          }
        }
      } catch (err) {
        console.error("Gagal memuat opsi filter:", err);
      }
    }
    loadOptions();
  }, []);

  // Fetch report data
  const fetchReportData = async () => {
    const currentReq = ++requestCounter.current;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedSubject) params.set("subjectId", selectedSubject);
      if (selectedClass) params.set("classId", selectedClass);
      if (selectedTeacher) params.set("teacherId", selectedTeacher);
      if (selectedYear) params.set("academicYear", selectedYear);

      const res = await fetch(`/api/kurikulum/reports/grades?${params.toString()}`);
      const json = await res.json();

      if (currentReq !== requestCounter.current) return;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat laporan nilai akademik");
      }

      setRows(json.data?.rows || []);
      setCurrentPage(1);
    } catch (err: unknown) {
      if (currentReq === requestCounter.current) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat laporan";
        setError(message);
      }
    } finally {
      if (currentReq === requestCounter.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedSubject, selectedClass, selectedTeacher, selectedYear]);

  // Client-side search filtering
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => {
      const matchName = r.studentName.toLowerCase().includes(q);
      const matchNis = r.nis ? r.nis.toLowerCase().includes(q) : false;
      const matchClass = r.className.toLowerCase().includes(q);
      const matchSubject = r.subjectName.toLowerCase().includes(q);
      const matchTeacher = r.teacherName.toLowerCase().includes(q);
      return matchName || matchNis || matchClass || matchSubject || matchTeacher;
    });
  }, [rows, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage]);

  // Aggregate stats from current filtered rows
  const stats = useMemo(() => {
    const totalStudents = new Set(filteredRows.map((r) => r.studentId)).size;
    const gradedRows = filteredRows.filter((r) => r.finalAverage !== null);
    const overallAvg =
      gradedRows.length > 0
        ? Math.round(
            (gradedRows.reduce((acc, r) => acc + (r.finalAverage || 0), 0) /
              gradedRows.length) *
              10
          ) / 10
        : null;

    const assignRows = filteredRows.filter((r) => r.assignmentAverage !== null);
    const assignAvg =
      assignRows.length > 0
        ? Math.round(
            (assignRows.reduce((acc, r) => acc + (r.assignmentAverage || 0), 0) /
              assignRows.length) *
              10
          ) / 10
        : null;

    const quizRows = filteredRows.filter((r) => r.quizAverage !== null);
    const quizAvg =
      quizRows.length > 0
        ? Math.round(
            (quizRows.reduce((acc, r) => acc + (r.quizAverage || 0), 0) /
              quizRows.length) *
              10
          ) / 10
        : null;

    return {
      totalEntries: filteredRows.length,
      totalStudents,
      overallAvg,
      assignAvg,
      quizAvg,
    };
  }, [filteredRows]);

  // Export Excel handler
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (selectedSubject) params.set("subjectId", selectedSubject);
    if (selectedClass) params.set("classId", selectedClass);
    if (selectedTeacher) params.set("teacherId", selectedTeacher);
    if (selectedYear) params.set("academicYear", selectedYear);

    const exportUrl = `/api/kurikulum/reports/export?${params.toString()}`;
    window.open(exportUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Portal Kurikulum</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-blue-600 font-bold">Laporan Nilai</span>
          </div>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Laporan Nilai Akademik
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Rekapitulasi pencapaian hasil belajar seluruh siswa dan komparasi nilai per mata pelajaran.
          </p>
        </div>

        {/* Top Actions: Recap Link, Export Excel, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kurikulum/reports/recap"
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
          >
            <Printer className="size-3.5 text-blue-600" />
            <span>Lihat Rekap Resmi</span>
          </Link>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            aria-label="Segarkan data laporan"
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
            <h2 className="font-semibold text-red-900">Laporan gagal dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchReportData}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Siswa */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Siswa Terdata
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.totalStudents}
            </p>
            <p className="text-[11px] text-slate-500">
              {stats.totalEntries} entri mata pelajaran
            </p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="size-5.5" />
          </div>
        </div>

        {/* Card 2: Rata-Rata Kumulatif */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-Rata Kumulatif
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : stats.overallAvg !== null ? (
                `${stats.overallAvg}`
              ) : (
                <span className="text-sm font-semibold text-slate-400 italic">Belum ada nilai</span>
              )}
            </p>
            <p className="text-[11px] text-slate-500">Skala penilaian 0-100</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Award className="size-5.5" />
          </div>
        </div>

        {/* Card 3: Rata-Rata Tugas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-Rata Tugas
            </span>
            <p className="mt-1 text-2xl font-extrabold text-blue-700">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : stats.assignAvg !== null ? (
                stats.assignAvg
              ) : (
                <span className="text-sm font-semibold text-slate-400 italic">-</span>
              )}
            </p>
            <p className="text-[11px] text-slate-500">Seluruh tugas terselesaikan</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="size-5.5" />
          </div>
        </div>

        {/* Card 4: Rata-Rata Kuis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-Rata Kuis
            </span>
            <p className="mt-1 text-2xl font-extrabold text-purple-700">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : stats.quizAvg !== null ? (
                stats.quizAvg
              ) : (
                <span className="text-sm font-semibold text-slate-400 italic">-</span>
              )}
            </p>
            <p className="text-[11px] text-slate-500">Seluruh kuis terselesaikan</p>
          </div>
          <div className="grid size-11 place-items-center rounded-xl bg-purple-50 text-purple-600">
            <GraduationCap className="size-5.5" />
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label="Filter Mata Pelajaran"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Semua Mata Pelajaran</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              aria-label="Filter Kelas"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Teacher Filter */}
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              aria-label="Filter Guru"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Academic Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter Tahun Ajaran"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2023/2024">2023/2024</option>
            </select>

            {(selectedSubject || selectedClass || selectedTeacher || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject("");
                  setSelectedClass("");
                  setSelectedTeacher("");
                  setSearchQuery("");
                }}
                className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              >
                <Filter className="size-3 text-slate-400" />
                Reset
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa, NIS, kelas, atau mapel..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* 5. Main Report Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Nilai Siswa
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {filteredRows.length} Entri
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="w-12 px-4 py-3.5 sm:px-6 text-center">
                  No
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Siswa
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Kelas
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Mata Pelajaran
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6">
                  Guru Pengampu
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Tugas
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Kuis
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Nilai Akhir
                </th>
                <th scope="col" className="px-4 py-3.5 sm:px-6 text-center">
                  Predikat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-7 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-4 w-10 mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-4 w-10 mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-6 w-12 rounded-lg mx-auto" />
                    </td>
                    <td className="px-4 py-3.5 sm:px-6 text-center">
                      <Skeleton className="h-5 w-8 rounded-full mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Inbox className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {searchQuery || selectedSubject || selectedClass || selectedTeacher
                        ? "Tidak ada data nilai yang sesuai kriteria filter"
                        : "Belum ada rekaman nilai akademik"}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                      {searchQuery || selectedSubject || selectedClass || selectedTeacher
                        ? "Coba ubah atau reset filter untuk menampilkan data lainnya."
                        : "Data laporan nilai akademik akan terakumulasi otomatis saat penilaian tugas dan kuis dilakukan."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const predicate = getPredicate(row.finalAverage);
                  return (
                    <tr
                      key={`${row.studentId}_${row.subjectName}_${idx}`}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* No */}
                      <td className="px-4 py-3.5 sm:px-6 text-center text-slate-400 font-semibold">
                        {rowNumber}
                      </td>

                      {/* Siswa */}
                      <td className="px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 border border-blue-200">
                            {getInitials(row.studentName)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {row.studentName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {row.nis ? `NIS. ${row.nis}` : "NIS: -"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="px-4 py-3.5 sm:px-6 font-semibold text-slate-800">
                        {row.className}
                      </td>

                      {/* Mata Pelajaran */}
                      <td className="px-4 py-3.5 sm:px-6 font-semibold text-slate-800">
                        {row.subjectName}
                      </td>

                      {/* Guru */}
                      <td className="px-4 py-3.5 sm:px-6 text-slate-600">
                        {row.teacherName}
                      </td>

                      {/* Rata-Rata Tugas */}
                      <td className="px-4 py-3.5 sm:px-6 text-center font-bold text-slate-700">
                        {row.assignmentAverage !== null ? (
                          row.assignmentAverage
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum ada nilai</span>
                        )}
                      </td>

                      {/* Rata-Rata Kuis */}
                      <td className="px-4 py-3.5 sm:px-6 text-center font-bold text-slate-700">
                        {row.quizAverage !== null ? (
                          row.quizAverage
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum ada nilai</span>
                        )}
                      </td>

                      {/* Nilai Akhir */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        {row.finalAverage !== null ? (
                          <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 border border-blue-200/60">
                            {row.finalAverage}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum ada nilai</span>
                        )}
                      </td>

                      {/* Predikat */}
                      <td className="px-4 py-3.5 sm:px-6 text-center">
                        <span
                          className={`inline-block size-6 rounded-full text-center leading-6 text-xs font-bold ${
                            predicate === "A"
                              ? "bg-emerald-100 text-emerald-800"
                              : predicate === "B"
                              ? "bg-blue-100 text-blue-800"
                              : predicate === "C"
                              ? "bg-amber-100 text-amber-800"
                              : predicate === "D"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {predicate}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Menampilkan {paginatedRows.length} dari {filteredRows.length} entri (Halaman {currentPage} dari {totalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
