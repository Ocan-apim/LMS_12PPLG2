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
  Bell,
  Calendar as CalendarIcon,
  ClipboardList,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";

interface DashboardData {
  student?: StudentBannerInfo;
  stats?: {
    totalClasses: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    totalQuizzes: number;
    completedQuizzes: number;
    pendingQuizzes: number;
    averageGrade: number;
    totalGraded: number;
    upcomingDeadlines: number;
    unreadNotifications: number;
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
    className: string;
    bannerColor: string;
    status: string;
    score: number | null;
    feedback?: string | null;
    isUrgent?: boolean;
    href?: string;
  }>;
  notifications?: Array<{
    _id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
  }>;
  unreadNotificationsCount?: number;
  personalEvents?: Array<{
    _id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
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
    fetchDashboard();
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

  const stats = data.stats || {
    totalClasses: data.totalJoinedClasses,
    totalAssignments: tugasItems.length,
    completedAssignments: tugasItems.filter(
      (t) => t.status === "graded" || t.status === "turned_in"
    ).length,
    pendingAssignments: tugasItems.filter(
      (t) => t.status !== "graded" && t.status !== "turned_in"
    ).length,
    totalQuizzes: kuisItems.length,
    completedQuizzes: kuisItems.filter((q) => q.isCompleted).length,
    pendingQuizzes: kuisItems.filter((q) => !q.isCompleted).length,
    averageGrade: data.averageGrade,
    totalGraded: data.totalGraded,
    upcomingDeadlines:
      tugasItems.filter((t) => t.status !== "graded" && t.status !== "turned_in").length +
      kuisItems.filter((q) => !q.isCompleted).length,
    unreadNotifications: data.unreadNotificationsCount || 0,
  };

  const notifications = data.notifications || [];
  const unreadCount = data.unreadNotificationsCount ?? stats.unreadNotifications;
  const personalEvents = data.personalEvents || [];

  return (
    <div className="animate-fade-up space-y-8 pb-8">
      {/* 1. Student Profile Banner & Average Score */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <JoinClassBanner student={data.student} />
        <AverageScoreCard
          average={data.averageGrade}
          totalGraded={data.totalGraded}
        />
      </div>

      {/* 2. Real Database-Backed Academic Progress & Statistics */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#e4e6ef] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[var(--primary)]">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Mata Pelajaran
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {stats.totalClasses} Kelas
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#e4e6ef] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-[#674ce7]">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Progres Tugas
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {stats.completedAssignments} / {stats.totalAssignments}
            </p>
            <p className="text-[10px] text-slate-500">
              {stats.pendingAssignments} belum selesai
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#e4e6ef] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#00796f]">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Progres Kuis
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {stats.completedQuizzes} / {stats.totalQuizzes}
            </p>
            <p className="text-[10px] text-slate-500">
              {stats.pendingQuizzes} tersedia
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#e4e6ef] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Tenggat Aktif
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {stats.upcomingDeadlines} Aktivitas
            </p>
          </div>
        </div>
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

      {/* 4. Kuis, Kalender Pribadi, & Notifikasi */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Kuis Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <HelpCircle className="size-5 text-[#674ce7]" />
              <span>Kuis ({kuisItems.length})</span>
            </h2>
            <Link
              href="/siswa/quiz"
              className="text-xs font-extrabold text-[var(--primary)] hover:underline"
            >
              View All &gt;
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white">
            {kuisItems.length === 0 ? (
              <div className="p-8 text-center">
                <HelpCircle className="mx-auto size-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada kuis aktif.</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Kuis yang diterbitkan oleh guru akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e4e6ef]">
                {kuisItems.slice(0, 4).map((quiz) => {
                  const dueText = quiz.dueDate
                    ? new Date(quiz.dueDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Tanpa batas waktu";

                  return (
                    <Link
                      key={quiz._id}
                      href={quiz.href}
                      className="flex items-start justify-between gap-3 p-4 hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {quiz.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {quiz.className} &bull; Tenggat: {dueText}
                        </p>
                        {quiz.isGraded && quiz.score !== null && (
                          <p className="mt-1 text-xs font-extrabold text-[#00796f] flex items-center gap-1">
                            <Award className="size-3.5" />
                            <span>
                              Nilai: {quiz.score} / {quiz.maxScore}
                            </span>
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded px-2.5 py-0.5 text-[10px] font-extrabold uppercase shrink-0 ${
                          quiz.isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : quiz.status === "late"
                              ? "bg-red-100 text-red-700"
                              : "bg-[#eee9ff] text-[#674ce7]"
                        }`}
                      >
                        {quiz.isCompleted
                          ? "Selesai"
                          : quiz.status === "late"
                            ? "Terlambat"
                            : "Tersedia"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Kalender & Agenda Pribadi Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="size-5 text-blue-600" />
              <span>Event Kalender ({personalEvents.length})</span>
            </h2>
            <Link
              href="/siswa/schedule"
              className="text-xs font-extrabold text-[var(--primary)] hover:underline"
            >
              Buka Kalender &gt;
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white">
            {personalEvents.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarIcon className="mx-auto size-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada event pribadi.</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Tambahkan jadwal belajar Anda di halaman Kalender.
                </p>
                <Link
                  href="/siswa/schedule"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition"
                >
                  + Tambah Event
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#e4e6ef]">
                {personalEvents.slice(0, 4).map((ev) => (
                  <Link
                    key={ev._id}
                    href="/siswa/schedule"
                    className="block p-4 hover:bg-slate-50 transition"
                  >
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                        {ev.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-bold text-blue-600">
                      {ev.startDate === ev.endDate
                        ? ev.startDate
                        : `${ev.startDate} s/d ${ev.endDate}`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notifikasi Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Bell className="size-5 text-amber-500" />
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {unreadCount} baru
                </span>
              )}
            </h2>
            <Link
              href="/siswa/notifications"
              className="text-xs font-extrabold text-[var(--primary)] hover:underline"
            >
              View All &gt;
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto size-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada notifikasi.</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Pemberitahuan tugas, kuis, dan nilai akan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e4e6ef]">
                {notifications.slice(0, 4).map((notif) => (
                  <Link
                    key={notif._id}
                    href={notif.link || "/siswa/notifications"}
                    className={`block p-4 hover:bg-slate-50 transition ${
                      !notif.read ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                      {notif.message}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 5. File yang dibagi */}
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
