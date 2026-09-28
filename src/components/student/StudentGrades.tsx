"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Code2,
  SlidersHorizontal,
  Star,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderOpen,
  FileText,
  HelpCircle,
} from "lucide-react";
import { BackButton } from "@/components/student/BackButton";
import { FooterBar, SmoothProgress } from "@/components/student/StudentDashboardComponents";

interface SubjectBreakdownItem {
  courseClassId: string;
  subjectName: string;
  className: string;
  teacherName: string;
  letterGrade: string;
  averageScore: number;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  feedback: string;
}

interface GradedItem {
  _id: string;
  title: string;
  type: string;
  className: string;
  teacherName: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback?: string | null;
  submittedAt: string;
  gradedAt: string;
}

interface GradeTrend {
  month: string;
  average: number;
}

interface GradesData {
  currentGpa: number;
  totalGraded: number;
  gradeTrends: GradeTrend[];
  subjectBreakdown: SubjectBreakdownItem[];
  gradedItems: GradedItem[];
}

export function StudentGrades() {
  const [data, setData] = useState<GradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/grades");
      if (!res.ok) {
        throw new Error("Gagal mengambil data penilaian.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || "Data nilai tidak valid.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat nilai.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  return (
    <div className="animate-fade-up px-2 pb-12">
      <BackButton />
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
          Ringkasan Penilaian
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Pantau capaian akademik, evaluasi tugas, dan riwayat nilai Anda secara transparan.
        </p>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="size-8 animate-spin text-[#674ce7]" />
          <p className="text-sm font-semibold text-slate-600">Memuat data nilai...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchGrades}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
          >
            <RefreshCw className="size-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <div className="space-y-8">
          {/* Top Row: GPA Card & Trend Chart */}
          <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
            {/* Current GPA Card */}
            <section className="relative overflow-hidden rounded-2xl border border-[#d9deeb] bg-white p-7 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Nilai Rata-rata Saat Ini
              </p>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold text-[#674ce7]">
                  {data.currentGpa}
                </span>
                <span className="mb-2 text-sm font-semibold text-slate-500">/ 100</span>
              </div>
              <div className="mt-6">
                <SmoothProgress value={data.currentGpa} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Total <strong>{data.totalGraded}</strong> tugas dan evaluasi dinilai
              </p>
              <Star className="absolute -bottom-4 right-[-10px] size-24 text-slate-100 pointer-events-none" />
            </section>

            {/* Grade Trends Chart */}
            <section className="rounded-2xl border border-[#d9deeb] bg-white p-7 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Tren Perkembangan Nilai
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Rata-rata performa bulanan</p>
                </div>
                <div className="flex gap-4 text-xs font-semibold text-slate-600">
                  <span className="before:mr-1.5 before:inline-block before:size-2 before:rounded-full before:bg-[#674ce7]">
                    Tahun Ini
                  </span>
                </div>
              </div>

              {data.gradeTrends.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center text-xs text-slate-400 italic">
                  Belum ada data riwayat bulanan yang cukup untuk menampilkan grafik.
                </div>
              ) : (
                <div className="mt-6 h-32">
                  <svg viewBox="0 0 680 140" className="h-full w-full">
                    {[20, 50, 80, 110].map((y) => (
                      <line key={y} x1="0" x2="680" y1={y} y2={y} stroke="#edf0f6" strokeDasharray="3 3" />
                    ))}
                    {/* Visual Polyline */}
                    <polyline
                      points={data.gradeTrends
                        .map((t, idx) => {
                          const x = (idx / Math.max(1, data.gradeTrends.length - 1)) * 640 + 20;
                          const y = 120 - (t.average / 100) * 90;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#674ce7"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {data.gradeTrends.map((t, idx) => {
                      const x = (idx / Math.max(1, data.gradeTrends.length - 1)) * 640 + 20;
                      const y = 120 - (t.average / 100) * 90;
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="5" fill="#674ce7" stroke="#ffffff" strokeWidth="2" />
                          <text x={x} y="136" fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="bold">
                            {t.month} ({t.average})
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </section>
          </div>

          {/* Subject Breakdown Table */}
          <section className="overflow-hidden rounded-2xl border border-[#d9deeb] bg-white shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-[#e5e7ef]">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                Capaian Per Mata Pelajaran
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {data.subjectBreakdown.length} Kelas Mapel
              </span>
            </div>

            <div className="grid grid-cols-[1.5fr_0.6fr_0.8fr_1.4fr_0.5fr] border-b border-[#e5e7ef] bg-[#fbf8ff] px-6 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              <span>Mata Pelajaran</span>
              <span>Predikat</span>
              <span>Tugas Selesai</span>
              <span>Catatan Guru</span>
              <span className="text-right">Aksi</span>
            </div>

            {data.subjectBreakdown.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                Belum ada kelas mata pelajaran yang terdaftar.
              </div>
            ) : (
              data.subjectBreakdown.map((item) => (
                <div
                  key={item.courseClassId}
                  className="grid grid-cols-[1.5fr_0.6fr_0.8fr_1.4fr_0.5fr] items-center border-b border-[#e5e7ef] px-6 py-4 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eee9ff] text-[#674ce7]">
                      <BookOpen className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.subjectName}</p>
                      <p className="text-xs text-slate-400">{item.teacherName}</p>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-extrabold ${
                        item.letterGrade === "A"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.letterGrade.startsWith("B")
                            ? "bg-blue-100 text-blue-800"
                            : item.letterGrade === "C"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.letterGrade} ({item.averageScore})
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-700">
                      {item.completedTasks} / {item.totalTasks} Tugas
                    </span>
                    <div className="mt-1.5 w-24">
                      <SmoothProgress value={item.progress} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic line-clamp-2 pr-4">
                    &ldquo;{item.feedback}&rdquo;
                  </p>

                  <div className="text-right">
                    <Link
                      href={`/siswa/courses/${item.courseClassId}`}
                      className="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#674ce7] hover:text-[#674ce7] transition"
                    >
                      Buka Kelas
                    </Link>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Graded Items History */}
          <section className="overflow-hidden rounded-2xl border border-[#d9deeb] bg-white shadow-sm">
            <div className="p-6 border-b border-[#e5e7ef]">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                Riwayat Penilaian Tugas & Kuis
              </h2>
            </div>

            {data.gradedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <FolderOpen className="size-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Belum Ada Nilai Diterbitkan</p>
                <p className="text-xs text-slate-400">
                  Tugas atau kuis yang telah Anda kumpulkan akan muncul di sini setelah dinilai oleh guru.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e5e7ef]">
                {data.gradedItems.map((item) => (
                  <div key={item._id} className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          item.type === "kuis" ? "bg-emerald-100 text-[#00796f]" : "bg-[#eee9ff] text-[#674ce7]"
                        }`}
                      >
                        {item.type === "kuis" ? <HelpCircle className="size-5" /> : <FileText className="size-5" />}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.className} &bull; Dinilai pada:{" "}
                          {new Date(item.gradedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {item.feedback && (
                        <p className="hidden max-w-xs text-xs italic text-slate-500 md:block truncate">
                          &ldquo;{item.feedback}&rdquo;
                        </p>
                      )}
                      <div className="text-right">
                        <span className="font-[family-name:var(--font-display)] text-xl font-black text-[#674ce7]">
                          {item.score}
                        </span>
                        <span className="text-xs font-bold text-slate-400"> / {item.maxScore}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <FooterBar />
    </div>
  );
}
