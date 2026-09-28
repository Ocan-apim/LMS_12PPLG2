"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AverageScoreCard,
  DashboardSubjectCard,
  FooterBar,
  JoinClassBanner,
  SharedFileCard,
  TaskList,
} from "@/components/student/StudentDashboardComponents";
import { Loader2, AlertCircle, RefreshCw, BookOpen, FolderOpen } from "lucide-react";

interface DashboardData {
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
    isUrgent?: boolean;
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

  return (
    <div className="animate-fade-up">
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <JoinClassBanner />
        <AverageScoreCard average={data.averageGrade} />
      </div>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_390px]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
              Mata Pelajaran
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
                />
              ))}
            </div>
          )}
        </section>

        <TaskList tasks={data.upcomingAssignments} />
      </div>

      <section className="mt-8">
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
            <p className="text-sm font-bold text-slate-700">Belum ada file materi yang dibagikan.</p>
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

      <FooterBar />
    </div>
  );
}
