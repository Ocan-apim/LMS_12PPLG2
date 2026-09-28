"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Play,
  RotateCcw,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Question {
  id: string;
  type: string;
  question: string;
  imageUrl?: string;
  options: string[];
  points: number;
}

interface QuizResult {
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  submittedAt?: string;
}

interface QuizData {
  _id: string;
  assignmentId?: string | null;
  title: string;
  description?: string;
  durationSeconds: number;
  totalPoints: number;
  totalQuestions: number;
  courseClass: {
    _id: string;
    name: string;
    bannerColor: string;
  };
  isStarted: boolean;
  startedAt?: string | null;
  remainingSeconds: number;
  isCompleted: boolean;
  questions?: Question[];
  result?: QuizResult;
}

export default function SiswaQuizTakePage({ params }: PageProps) {
  const { id } = use(params);

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  // Take Mode States
  const [viewMode, setViewMode] = useState<"intro" | "taking" | "result">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/siswa/quiz/${id}`);
      setStatusCode(res.status);

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Akses ditolak: Anda tidak terdaftar di kelas kuis ini.");
        }
        if (res.status === 404) {
          throw new Error("Kuis tidak ditemukan atau belum diterbitkan.");
        }
        throw new Error("Gagal memuat kuis.");
      }

      const data = await res.json();
      if (data.success && data.data) {
        const qData: QuizData = data.data;
        setQuiz(qData);

        if (qData.isCompleted && qData.result) {
          setResult(qData.result);
          setViewMode("result");
        } else if (qData.isStarted && qData.remainingSeconds > 0) {
          setTimeLeft(qData.remainingSeconds);
          setViewMode("taking");
        } else {
          setTimeLeft(qData.durationSeconds || 60);
          setViewMode("intro");
        }
      } else {
        throw new Error(data.message || "Gagal memproses data kuis.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Timer Countdown in "taking" mode
  useEffect(() => {
    if (viewMode === "taking" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [viewMode]);

  // Start Quiz via POST /api/siswa/quiz/[id]/start
  const handleStartQuiz = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/siswa/quiz/${id}/start`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memulai kuis");
      }

      setTimeLeft(data.data.remainingSeconds || 60);
      setViewMode("taking");
      setCurrentIndex(0);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat memulai kuis");
    } finally {
      setLoading(false);
    }
  };

  // Submit Quiz Answers via POST /api/siswa/quiz/[id]/submit
  const handleSubmitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (timerRef.current) clearInterval(timerRef.current);

      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const res = await fetch(`/api/siswa/quiz/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: formattedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengumpulkan kuis");
      }

      setResult(data.data);
      setViewMode("result");
      setShowConfirmModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat mengumpulkan kuis");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    alert("Waktu pengerjaan kuis telah habis! Jawaban Anda akan dikumpulkan secara otomatis.");
    handleSubmitQuiz();
  };

  // Select Option for Current Question
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Format Time Remaining (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Render 403 Forbidden State
  if (statusCode === 403) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
          Akses Terbatas (403)
        </h1>
        <p className="max-w-md text-sm text-slate-600">
          Anda tidak terdaftar sebagai peserta kelas mata pelajaran ini, sehingga tidak memiliki akses untuk mengerjakan kuis ini.
        </p>
        <Link
          href="/siswa/assignments"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Tugas
        </Link>
      </div>
    );
  }

  // Render 404 Not Found State
  if (statusCode === 404) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
          Kuis Tidak Ditemukan (404)
        </h1>
        <p className="max-w-md text-sm text-slate-600">
          Kuis ini mungkin belum diterbitkan oleh guru atau tautan yang Anda tuju tidak valid.
        </p>
        <Link
          href="/siswa/assignments"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Tugas
        </Link>
      </div>
    );
  }

  // Render Error State
  if (!loading && error && !quiz) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-red-100 text-red-600 shadow-sm">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Gagal Memuat Kuis</h1>
        <p className="max-w-md text-sm text-slate-600">{error}</p>
        <button
          onClick={fetchQuiz}
          className="inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
        >
          <RefreshCw className="size-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  // Render Loading State
  if (loading || !quiz) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-10 animate-spin text-[#674ce7]" />
        <p className="text-sm font-semibold text-slate-600">Menyiapkan kuis...</p>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="animate-fade-up px-2 pb-12">
      {/* 1. STAGE: QUIZ INTRO */}
      {viewMode === "intro" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/siswa/assignments"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[#674ce7]"
            >
              <ArrowLeft className="size-4" />
              Kembali ke Daftar Tugas
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4edff] px-3 py-1.5 text-xs font-bold text-[#674ce7]">
              <BookOpen className="size-3.5" />
              {quiz.courseClass.name}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#eee9ff] text-[#674ce7] shadow-sm">
              <HelpCircle className="size-8" />
            </div>

            <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {quiz.title}
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
              {quiz.description || "Kerjakan kuis dengan teliti dan jujur sebelum batas waktu berakhir."}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-[#fbf8ff] p-4 text-center">
                <Clock className="mx-auto size-5 text-[#674ce7]" />
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Durasi Waktu
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-800">
                  {Math.round((quiz.durationSeconds || 60) / 60)} Menit
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-[#fbf8ff] p-4 text-center">
                <HelpCircle className="mx-auto size-5 text-[#674ce7]" />
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Jumlah Soal
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-800">
                  {quiz.totalQuestions} Soal
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-[#fbf8ff] p-4 text-center">
                <Award className="mx-auto size-5 text-[#674ce7]" />
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Total Nilai
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-800">
                  {quiz.totalPoints} Poin
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <button
                onClick={handleStartQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-8 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#563cd6] hover:shadow-md"
              >
                <Play className="size-4 fill-white" />
                Mulai Kerjakan Kuis Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. STAGE: QUIZ TAKING INTERFACE */}
      {viewMode === "taking" && currentQuestion && (
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Top Bar with Timer */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {quiz.courseClass.name}
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                {quiz.title}
              </h2>
            </div>

            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold shadow-xs transition ${
                timeLeft < 60
                  ? "animate-pulse bg-red-100 text-red-700 border border-red-200"
                  : "bg-[#eee9ff] text-[#674ce7] border border-[#ded4ff]"
              }`}
            >
              <Clock className="size-4" />
              <span>Sisa Waktu: {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Question Grid: Left Question, Right Palette */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
            {/* Main Question Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                {/* Header: Question Number & Progress */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="font-[family-name:var(--font-display)] text-sm font-extrabold text-slate-700">
                    Soal No. {currentIndex + 1} dari {totalQuestions}
                  </span>
                  <span className="text-xs font-bold text-[#674ce7] bg-[#f4edff] px-2.5 py-1 rounded-md">
                    {currentQuestion.points} Poin
                  </span>
                </div>

                {/* Question Text */}
                <div className="mt-5">
                  <p className="text-base font-semibold leading-relaxed text-slate-900 whitespace-pre-line">
                    {currentQuestion.question}
                  </p>

                  {/* Optional Image */}
                  {currentQuestion.imageUrl && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 max-h-72">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Soal Lampiran"
                        className="object-contain w-full h-full"
                      />
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div className="mt-6 space-y-3">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = answers[currentQuestion.id] === optIdx;
                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                        className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition ${
                          isSelected
                            ? "border-[#674ce7] bg-[#fbf8ff] shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold uppercase transition ${
                            isSelected
                              ? "bg-[#674ce7] text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? "font-bold text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((c) => c - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                  Sebelumnya
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((c) => c + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#674ce7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#563cd6]"
                  >
                    Selanjutnya
                    <ChevronRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#00796f] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#00655d]"
                  >
                    <CheckCircle2 className="size-4" />
                    Kumpulkan Kuis
                  </button>
                )}
              </div>
            </div>

            {/* Right Sidebar: Question Palette & Quick Submit */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-[family-name:var(--font-display)] text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Navigasi Soal
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  Terjawab: {answeredCount} dari {totalQuestions}
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`grid size-10 place-items-center rounded-xl text-xs font-extrabold transition ${
                          isCurrent
                            ? "border-2 border-[#674ce7] bg-[#f4edff] text-[#674ce7]"
                            : isAnswered
                              ? "bg-[#674ce7] text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full rounded-xl bg-[#674ce7] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#563cd6]"
                  >
                    Kumpulkan Kuis
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center animate-scale-up">
                <HelpCircle className="mx-auto size-12 text-[#674ce7]" />
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                  Konfirmasi Pengumpulan
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{totalQuestions}</strong> soal.
                  {answeredCount < totalQuestions && (
                    <span className="block mt-1 text-amber-600 font-bold">
                      Peringatan: Masih ada {totalQuestions - answeredCount} soal yang belum dijawab!
                    </span>
                  )}
                  Apakah Anda yakin ingin menyelesaikan kuis ini?
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Lanjutkan Mengerjakan
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#674ce7] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6] disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    Ya, Kumpulkan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. STAGE: QUIZ RESULT */}
      {viewMode === "result" && result && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#d4f8ec] text-[#00796f] shadow-sm">
              <CheckCircle2 className="size-8" />
            </div>

            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Kuis Selesai!
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Evaluasi hasil pengerjaan kuis Anda untuk <strong>{quiz.title}</strong>
            </p>

            {/* Score Metrics Grid matching Figma Page 3 */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Benar */}
              <div className="rounded-xl border border-emerald-100 bg-[#f4fbf8] p-5 text-center">
                <CheckCircle2 className="mx-auto size-6 text-[#00796f]" />
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-[#00796f]">
                  Benar
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#00796f]">
                  {result.correctCount} Soal
                </p>
              </div>

              {/* Salah */}
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-5 text-center">
                <XCircle className="mx-auto size-6 text-red-500" />
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-red-600">
                  Salah
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-red-600">
                  {result.incorrectCount} Soal
                </p>
              </div>

              {/* Nilai Akhir */}
              <div className="rounded-xl border border-[#d9cfee] bg-[#fbf8ff] p-5 text-center">
                <Award className="mx-auto size-6 text-[#674ce7]" />
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-[#674ce7]">
                  Nilai Akhir
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#674ce7]">
                  {result.score} / {result.maxScore || 100}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-6">
              <Link
                href="/siswa/assignments"
                className="inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#563cd6]"
              >
                <ArrowLeft className="size-4" />
                Kembali ke Daftar Tugas
              </Link>
              <Link
                href={`/siswa/courses/${quiz.courseClass._id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[#674ce7]"
              >
                <BookOpen className="size-4" />
                Lihat Kelas Mata Pelajaran
              </Link>
            </div>
          </div>
        </div>
      )}

      <FooterBar />
    </div>
  );
}
