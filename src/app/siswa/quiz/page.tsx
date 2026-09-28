"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Clock,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

interface QuizAssignment {
  _id: string;
  title: string;
  subject: string;
  className: string;
  teacherName?: string;
  dueDate: string;
  dueTime: string;
  status: "pending" | "late" | "completed";
  score?: string;
  type: string;
  href: string;
}

export default function SiswaQuizListPage() {
  const [quizzes, setQuizzes] = useState<QuizAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/assignments");
      if (!res.ok) {
        throw new Error("Gagal mengambil daftar kuis.");
      }
      const data = await res.json();
      if (data.success && data.data?.assignments) {
        // Filter assignments of type "kuis"
        const quizList = data.data.assignments.filter(
          (a: any) => a.type === "kuis" || a.title.toLowerCase().includes("kuis")
        );
        setQuizzes(quizList);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat kuis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return (
    <div className="animate-fade-up px-2 pb-12">
      <div className="mb-7">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
          Kuis & Evaluasi
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Uji pemahaman materi Anda melalui kuis online yang disediakan oleh guru pengampu.
        </p>
      </div>

      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="size-8 animate-spin text-[#674ce7]" />
          <p className="text-sm font-semibold text-slate-600">Memuat daftar kuis...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchQuizzes}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
          >
            <RefreshCw className="size-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <FolderOpen className="size-12 text-slate-300" />
              <p className="font-[family-name:var(--font-display)] text-base font-bold text-slate-800">
                Belum Ada Kuis Aktif
              </p>
              <p className="max-w-md text-xs text-slate-500">
                Belum ada evaluasi kuis online yang diterbitkan untuk kelas yang Anda ikuti.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {quizzes.map((quiz) => (
                <div
                  key={quiz._id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4edff] px-2.5 py-1 text-xs font-bold text-[#674ce7]">
                        <BookOpen className="size-3.5" />
                        {quiz.className || quiz.subject}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          quiz.status === "completed"
                            ? "bg-[#d4f8ec] text-[#00796f]"
                            : quiz.status === "late"
                              ? "bg-red-100 text-red-700"
                              : "bg-[#eee9ff] text-[#674ce7]"
                        }`}
                      >
                        {quiz.status === "completed" ? "Selesai" : "Tersedia"}
                      </span>
                    </div>

                    <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                      {quiz.title}
                    </h2>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-slate-400" />
                        <span>Tenggat: {quiz.dueDate}</span>
                      </div>
                      {quiz.score && (
                        <div className="flex items-center gap-1.5 font-bold text-[#00796f]">
                          <Award className="size-3.5" />
                          <span>Nilai: {quiz.score}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <Link
                      href={`/siswa/quiz/${quiz._id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#674ce7] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#563cd6]"
                    >
                      {quiz.status === "completed" ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          Lihat Hasil Kuis
                        </>
                      ) : (
                        <>
                          Mulai Kerjakan
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <FooterBar />
    </div>
  );
}
