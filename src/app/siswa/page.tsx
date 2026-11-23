"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AverageScoreCard,
  DashboardSubjectCard,
  JoinClassBanner,
  SharedFileCard,
  TaskList,
  type StudentBannerInfo,
} from "@/components/student/StudentDashboardComponents";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  FolderOpen,
  HelpCircle,
  ClipboardList,
} from "lucide-react";

interface DashboardData {
  student?: StudentBannerInfo;
  stats?: {
    totalClasses: number;
    tenggatTugas?: number;
    tenggatKuis?: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    totalQuizzes: number;
    completedQuizzes: number;
    pendingQuizzes: number;
    averageGrade: number;
    totalGraded: number;
    upcomingDeadlines?: number;
  };
  averageGrade: number;
  totalGraded: number;
  totalJoinedClasses: number;
  classes: Array<{
    _id: string;
    name: string;
    teacher: string;
    category: string;
    bannerColor: string;
    urgentText: string;
    completed: boolean;
    totalTasks: number;
    completedTasks: number;
  }>;
  assignments?: Array<{
    _id: string;
    title: string;
    type: "tugas";
    dueDate?: string | null;
    maxScore: number;
    className: string;
    teacherName?: string;
    bannerColor: string;
    status: string;
    isSubmitted: boolean;
    isGraded: boolean;
    score: number | null;
    feedback?: string | null;
    isUrgent?: boolean;
    href: string;
  }>;
  quizzes?: Array<{
    _id: string;
    quizId: string;
    title: string;
    type: "kuis";
    dueDate?: string | null;
    maxScore: number;
    rawScore?: number | null;
    maxRawScore?: number;
    normalizedScore?: number | null;
    provisionalScore?: number | null;
    gradingStatus?: string;
    isPendingManual?: boolean;
    durationSeconds?: number;
    totalQuestions?: number;
    className: string;
    teacherName?: string;
    bannerColor: string;
    status: string;
    isCompleted: boolean;
    isGraded: boolean;
    score: number | null;
    isUrgent?: boolean;
    href: string;
  }>;
  upcomingAssignments: Array<{
    _id: string;
    title: string;
    type: "tugas" | "kuis";
    dueDate?: string;
    maxScore: number;
    rawScore?: number | null;
    maxRawScore?: number;
    normalizedScore?: number | null;
    provisionalScore?: number | null;
    gradingStatus?: string;
    isPendingManual?: boolean;
    className: string;
    bannerColor: string;
    status: string;
    score: number | null;
    feedback?: string | null;
    isUrgent?: boolean;
    href?: string;
  }>;
  recentFiles: Array<{
    name: string;
    url: string;
    type: string;
    size: string;
    uploadedAt: string;
    className: string;
  }>;
}

export default function SiswaDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat dashboard");
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/siswa/dashboard");
        const json = await res.json();
        if (!active) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat dashboard");
        }
        setData(json.data);
        setError(null);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#0066FF]" />
        <p className="text-sm font-semibold text-slate-500">Memuat dashboard siswa...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-base font-bold text-red-800">Gagal Memuat Data</h2>
        <p className="mt-1 text-sm text-red-600">{error || "Data tidak tersedia"}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition"
        >
          <RefreshCw className="size-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  const tugasItems =
    data.assignments ||
    data.upcomingAssignments.filter((item) => item.type !== "kuis");
  const kuisItems =
    data.quizzes ||
    data.upcomingAssignments
      .filter((item) => item.type === "kuis")
      .map((q) => ({
        ...q,
        quizId: q._id,
        type: "kuis" as const,
        isCompleted: q.status === "graded" || q.status === "turned_in",
        isGraded: q.status === "graded" && q.score !== null,
        href: q.href || `/siswa/quiz/${q._id}`,
      }));

  const pendingAssignmentsCount =
    data.stats?.tenggatTugas ??
    data.stats?.pendingAssignments ??
    tugasItems.filter((t) => t.status !== "graded" && t.status !== "turned_in").length;

  const pendingQuizzesCount =
    data.stats?.tenggatKuis ??
    data.stats?.pendingQuizzes ??
    kuisItems.filter((q) => !q.isCompleted).length;

  const totalClassesCount =
    data.stats?.totalClasses ?? data.totalJoinedClasses ?? data.classes.length;

  return (
    <div className="animate-fade-up space-y-8 pb-8">
      {/* 1. Simplified Welcome Container & Nilai rata-rata */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <JoinClassBanner student={data.student} />
        <AverageScoreCard
          average={data.averageGrade}
          totalGraded={data.totalGraded}
        />
      </div>

      {/* 2. Three Balanced Summary Cards: Mata Pelajaran, Tenggat Tugas, Tenggat Kuis */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/siswa/courses"
          className="rounded-xl border border-[#e4e6ef] bg-white p-5 shadow-xs flex items-center gap-4 hover:border-blue-300 transition"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[var(--primary)]">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Mata Pelajaran
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {totalClassesCount} Kelas
            </p>
          </div>
        </Link>

        <Link
          href="/siswa/assignments"
          className="rounded-xl border border-[#e4e6ef] bg-white p-5 shadow-xs flex items-center gap-4 hover:border-purple-300 transition"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-[#674ce7]">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Tenggat Tugas
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {pendingAssignmentsCount} Tugas
            </p>
          </div>
        </Link>

        <Link
          href="/siswa/quiz"
          className="rounded-xl border border-[#e4e6ef] bg-white p-5 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#00796f]">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Tenggat Kuis
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {pendingQuizzesCount} Kuis
            </p>
          </div>
        </Link>
      </section>

      {/* 3. Mata Pelajaran & Tugas */}
      <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
              Mata Pelajaran ({data.classes.length})
            </h2>
            <Link
              href="/siswa/courses"
              className="text-xs font-extrabold text-[var(--primary)] hover:underline"
            >
              View All &gt;
            </Link>
          </div>

          {data.classes.length === 0 ? (
            <div className="rounded-xl border border-[#e4e6ef] bg-white p-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-blue-50 text-[var(--primary)] mb-3">
                <BookOpen className="size-6" />
              </span>
              <p className="text-sm font-bold text-slate-700">Belum ada kelas.</p>
              <p className="mt-1 text-xs text-slate-500">
                Gunakan tombol &quot;Join Kelas Baru&quot; di atas untuk memasukkan kode kelas dari guru.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {data.classes.slice(0, 4).map((c) => (
                <DashboardSubjectCard
                  key={c._id}
                  id={c._id}
                  title={c.name}
                  subtitle={c.teacher}
                  urgent={c.urgentText}
                  completed={c.completed}
                  totalTasks={c.totalTasks}
                  completedTasks={c.completedTasks}
                />
              ))}
            </div>
          )}
        </section>

        <TaskList tasks={tugasItems} />
      </div>

      {/* 4. File yang dibagi */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
            File yang dibagi
          </h2>
          {data.recentFiles.length > 0 && (
            <Link
              href="/siswa/files"
              className="text-xs font-extrabold text-[var(--primary)] hover:underline"
            >
              View All &gt;
            </Link>
          )}
        </div>

        {data.recentFiles.length === 0 ? (
          <div className="rounded-xl border border-[#e4e6ef] bg-white p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500 mb-3">
              <FolderOpen className="size-6" />
            </span>
            <p className="text-sm font-bold text-slate-700">
              Belum ada file materi yang dibagikan.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Materi yang dibagikan oleh guru di kelas Anda akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {data.recentFiles.map((file, idx) => (
              <SharedFileCard key={idx} file={file} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
