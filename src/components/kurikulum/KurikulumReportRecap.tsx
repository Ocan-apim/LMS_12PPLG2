"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  Inbox,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface SchoolInfo {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  headmasterName: string;
}

export interface RecapSubjectScore {
  subjectId: string;
  subjectName: string;
  teacherName: string;
  assignmentAverage: number | null;
  quizAverage: number | null;
  average: number | null;
}

export interface RecapStudentRow {
  studentId: string;
  studentName: string;
  nis: string | null;
  nisn: string | null;
  className: string;
  subjects: RecapSubjectScore[];
  overallAverage: number | null;
}

export interface RecapData {
  school: SchoolInfo;
  academicYear: string;
  generatedAt: string;
  rows: RecapStudentRow[];
}

export interface ClassOption {
  id: string;
  name: string;
  grade?: string;
}

function getPredicate(score: number | null): string {
  if (score === null || score === undefined) return "-";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function KurikulumReportRecap() {
  const [data, setData] = useState<RecapData | null>(null);
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2024/2025");

  const requestCounter = useRef(0);

  // Load available classes for selection
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/kurikulum/grades/classes");
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.classesList)) {
          setClassesList(json.data.classesList);
          if (json.data.classesList.length > 0 && !selectedClassId) {
            setSelectedClassId(json.data.classesList[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat daftar kelas:", err);
      }
    }
    loadClasses();
  }, []);

  // Fetch recap document data
  const fetchRecap = async (classId?: string, year?: string) => {
    const currentReq = ++requestCounter.current;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (year) params.set("academicYear", year);

      const res = await fetch(`/api/kurikulum/reports/recap?${params.toString()}`);
      const json = await res.json();

      if (currentReq !== requestCounter.current) return;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat rekap laporan nilai");
      }

      setData(json.data);
    } catch (err: unknown) {
      if (currentReq === requestCounter.current) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat rekap";
        setError(message);
      }
    } finally {
      if (currentReq === requestCounter.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchRecap(selectedClassId, selectedYear);
    } else {
      fetchRecap(undefined, selectedYear);
    }
  }, [selectedClassId, selectedYear]);

  // Extract unique subjects across all student rows to construct dynamic table columns
  const uniqueSubjects = useMemo(() => {
    if (!data?.rows) return [];
    const map = new Map<string, string>();
    data.rows.forEach((r) => {
      r.subjects.forEach((s) => {
        if (!map.has(s.subjectName)) {
          map.set(s.subjectName, s.subjectName);
        }
      });
    });
    return Array.from(map.keys());
  }, [data]);

  const activeClassName = useMemo(() => {
    if (data?.rows && data.rows.length > 0) {
      return data.rows[0].className;
    }
    const found = classesList.find((c) => c.id === selectedClassId);
    return found ? found.name : "Semua Kelas";
  }, [data, classesList, selectedClassId]);

  return (
    <div className="space-y-6">
      {/* 1. Top Controls Bar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/kurikulum/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-1"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Laporan</span>
          </Link>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Rekap Nilai Resmi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Pratinjau dokumen cetak rekapitulasi penilaian akademik siswa lengkap dengan format resmi sekolah.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Selector */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={loading && !data}
            aria-label="Pilih Kelas Rombel"
            className="h-9.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          >
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

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

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Cetak rekap nilai resmi"
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition"
          >
            <Printer className="size-3.5" />
            <span>Cetak Dokumen</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={() => fetchRecap(selectedClassId || undefined, selectedYear)}
            disabled={loading}
            aria-label="Segarkan dokumen rekap"
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
          className="print:hidden flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">Rekapitulasi tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchRecap(selectedClassId || undefined, selectedYear)}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Printable Document Paper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-6">
              <Skeleton className="size-16 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Inbox className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Belum ada data siswa untuk kelas ini
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Pilih kelas lain pada pilihan di atas untuk menampilkan pratinjau rekap nilai resmi.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* A. Official School Letterhead (KOP SURAT) */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white font-extrabold text-2xl">
                    <GraduationCap className="size-9" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-wide uppercase text-slate-900">
                      {data.school.schoolName}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      NPSN: {data.school.npsn} | Alamat: {data.school.address}
                    </p>
                    <p className="text-xs text-slate-500">
                      Telepon: {data.school.phone} | Email: {data.school.email}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block text-right text-[11px] text-slate-500">
                  <p className="font-bold text-slate-700">PORTAL KURIKULUM</p>
                  <p>LEARNIX LMS</p>
                </div>
              </div>
            </div>

            {/* B. Document Title & Info Box */}
            <div className="text-center pt-2">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                REKAPITULASI LAPORAN NILAI HASIL BELAJAR SISWA
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Tahun Ajaran {data.academicYear}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Kelas</span>
                <p className="font-bold text-slate-900">{activeClassName}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Jumlah Siswa</span>
                <p className="font-bold text-slate-900">{data.rows.length} Orang</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Tahun Ajaran</span>
                <p className="font-bold text-slate-900">{data.academicYear}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Tanggal Terbit</span>
                <p className="font-bold text-slate-900">{formatDateIndo(data.generatedAt)}</p>
              </div>
            </div>

            {/* C. Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="border border-slate-300 px-3 py-2 text-center w-10">No</th>
                    <th className="border border-slate-300 px-3 py-2 w-28">NIS / NISN</th>
                    <th className="border border-slate-300 px-3 py-2">Nama Siswa</th>
                    {uniqueSubjects.map((subName) => (
                      <th
                        key={subName}
                        className="border border-slate-300 px-3 py-2 text-center whitespace-nowrap"
                      >
                        {subName}
                      </th>
                    ))}
                    <th className="border border-slate-300 px-3 py-2 text-center w-24">Rata-Rata</th>
                    <th className="border border-slate-300 px-3 py-2 text-center w-16">Predikat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, idx) => {
                    const predicate = getPredicate(row.overallAverage);
                    return (
                      <tr key={row.studentId} className="border-b border-slate-200">
                        <td className="border border-slate-300 px-3 py-2 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-600 font-mono text-[11px]">
                          {row.nis || row.nisn || "-"}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">
                          {row.studentName}
                        </td>
                        {uniqueSubjects.map((subName) => {
                          const subScore = row.subjects.find((s) => s.subjectName === subName);
                          return (
                            <td
                              key={subName}
                              className="border border-slate-300 px-3 py-2 text-center font-semibold"
                            >
                              {subScore && subScore.average !== null ? (
                                subScore.average
                              ) : (
                                <span className="text-slate-400 font-normal italic">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-slate-300 px-3 py-2 text-center font-extrabold text-blue-800">
                          {row.overallAverage !== null ? (
                            row.overallAverage
                          ) : (
                            <span className="text-slate-400 font-normal italic">Belum ada nilai</span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-bold">
                          {predicate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* D. Signatures Section */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center text-slate-800">
              <div>
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah</p>
                <div className="h-20" />
                <p className="font-extrabold underline text-slate-900">
                  {data.school.headmasterName}
                </p>
                <p className="text-[11px] text-slate-500">NIP. 19720315 199802 1 002</p>
              </div>

              <div>
                <p className="text-slate-500">Ditetapkan di Jakarta, {formatDateIndo(data.generatedAt)}</p>
                <p className="font-bold">Waka Bidang Kurikulum</p>
                <div className="h-20" />
                <p className="font-extrabold underline text-slate-900">
                  Dra. Siti Rahayu, M.Pd.
                </p>
                <p className="text-[11px] text-slate-500">NIP. 19780512 200312 2 001</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
