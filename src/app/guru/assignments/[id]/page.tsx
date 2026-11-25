"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Pencil,
  ChevronRight,
  Trash2,
  AlertCircle,
  HelpCircle,
  Clock,
  Award,
  CheckCircle2,
  Users,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Spinner } from "@/components/ui";
import { ThreadedComments, type CommentItem } from "@/components/comments/ThreadedComments";

interface AssignmentAttachment {
  name: string;
  url: string;
  type: string;
  size?: string;
}

interface SubmissionSummaryItem {
  submissionId: string | null;
  student: {
    _id: string;
    name: string;
    email: string;
    nisn?: string;
  };
  hasSubmitted: boolean;
  status: "turned_in" | "late" | "graded" | "assigned";
  gradingStatus?: string;
  isPendingManual?: boolean;
  score: number | null;
  rawScore?: number | null;
  maxRawScore?: number;
  normalizedScore?: number | null;
  feedback?: string;
  attachments?: AssignmentAttachment[];
  submittedAt: string | null;
  gradedAt: string | null;
}

interface SubmissionSummaryStats {
  totalStudents: number;
  turnedInCount: number;
  gradedCount: number;
  assignedCount: number;
  pendingManualCount: number;
}

interface QuizQuestionDetail {
  id: string;
  type?: "pilihan_ganda" | "essay";
  question: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer?: number | string;
  points?: number;
  pointsFalse?: number;
}

interface AssignmentDetail {
  _id: string;
  title: string;
  instructions?: string;
  description?: string;
  type: string;
  dueDate?: string;
  maxScore: number;
  maxRawScore?: number;
  turnedInCount: number;
  gradedCount: number;
  courseClassId?: {
    _id: string;
    name: string;
    code: string;
    classRombelId?: string | { _id: string; name?: string };
  };
  classId?: {
    _id: string;
    name: string;
    grade?: string;
  };
  teacherId?: {
    _id?: string;
    name?: string;
    email?: string;
    degree?: string;
  };
  quizId?: {
    _id: string;
    title: string;
    description?: string;
    durationSeconds?: number;
    totalPoints?: number;
    maxRawScore?: number;
    questions?: QuizQuestionDetail[];
  };
  attachments?: AssignmentAttachment[];
  isPublished?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
  createdAt: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Real comments state
  const [comments, setComments] = useState<CommentItem[]>([]);

  // Student submissions & grades summary state
  const [submissionItems, setSubmissionItems] = useState<SubmissionSummaryItem[]>([]);
  const [submissionStats, setSubmissionStats] = useState<SubmissionSummaryStats | null>(null);

  async function handleDeleteAssignment() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/guru/assignments/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setDeleteModalOpen(false);
        const role = assignment?.currentUserRole || "guru";
        const cId = assignment?.courseClassId?._id;
        const rId =
          typeof assignment?.courseClassId?.classRombelId === "object"
            ? assignment?.courseClassId?.classRombelId?._id
            : assignment?.courseClassId?.classRombelId || assignment?.classId?._id;
        const backUrl =
          role === "admin"
            ? rId && cId
              ? `/admin/classes/${rId}?courseClassId=${cId}`
              : "/admin/classes"
            : cId
              ? `/guru/classes/${cId}`
              : "/guru/assignments";
        router.push(backUrl);
      } else {
        alert(json.message || "Gagal menghapus tugas atau kuis");
      }
    } catch {
      alert("Terjadi kesalahan sistem saat menghapus tugas atau kuis");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    async function loadDetail() {
      try {
        setError(null);
        const [detailRes, subRes] = await Promise.all([
          fetch(`/api/guru/assignments/${id}`),
          fetch(`/api/guru/assignments/${id}/submissions`).catch(() => null),
        ]);
        const json = await detailRes.json();
        if (json.success) {
          setAssignment(json.data);
          if (json.data.comments && Array.isArray(json.data.comments)) {
            setComments(json.data.comments);
          }
        } else {
          setError(json.message || "Gagal memuat detail tugas atau kuis");
        }

        if (subRes && subRes.ok) {
          const subJson = await subRes.json();
          if (subJson.success && subJson.data) {
            setSubmissionItems(subJson.data.items || []);
            setSubmissionStats(subJson.data.stats || null);
          }
        }
      } catch (err: unknown) {
        console.error("Gagal memuat tugas:", err);
        setError("Terjadi kesalahan jaringan saat memuat tugas atau kuis");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  async function handleToggleStatus() {
    if (!assignment) return;
    const newStatus = assignment.isPublished === false ? true : false;
    try {
      const res = await fetch(`/api/guru/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setAssignment((prev) => (prev ? { ...prev, isPublished: newStatus } : null));
      }
    } catch (err) {
      console.error("Gagal mengubah status tugas:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center max-w-lg mx-auto">
        <h2 className="text-base font-bold text-red-900">Gagal Memuat Data</h2>
        <p className="mt-2 text-xs text-red-600">{error}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Tugas atau kuis tidak ditemukan</h2>
        <p className="mt-2 text-xs text-slate-500">
          Item ini mungkin telah dihapus atau Anda tidak memiliki akses.
        </p>
        <div className="mt-4 inline-block">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const userRole = assignment.currentUserRole || "guru";
  const isReadOnlyRole = ["kepsek", "kurikulum"].includes(userRole);
  const canManageContent = userRole === "guru" || userRole === "admin";
  const canComment = userRole === "guru" || userRole === "admin" || userRole === "siswa";

  const className = assignment.courseClassId?.name || "Kelas";
  const classId = assignment.courseClassId?._id;
  const rombelId =
    typeof assignment.courseClassId?.classRombelId === "object"
      ? assignment.courseClassId?.classRombelId?._id
      : assignment.courseClassId?.classRombelId || assignment.classId?._id;

  const classBackHref =
    userRole === "admin"
      ? rombelId && classId
        ? `/admin/classes/${rombelId}?courseClassId=${classId}`
        : "/admin/classes"
      : userRole === "kurikulum"
        ? rombelId && classId
          ? `/kurikulum/classes/${rombelId}?courseClassId=${classId}`
          : "/kurikulum/grades/classes"
        : userRole === "kepsek"
          ? rombelId && classId
            ? `/kepsek/classes/${rombelId}?courseClassId=${classId}`
            : "/kepsek/teachers"
          : classId
            ? `/guru/classes/${classId}`
            : "/guru/classes";

  const attachments = assignment.attachments || [];
  const isQuiz = assignment.type === "kuis" || Boolean(assignment.quizId);
  const quizQuestions = assignment.quizId?.questions || [];
  const maxRawScore =
    assignment.maxRawScore ??
    assignment.quizId?.maxRawScore ??
    assignment.quizId?.totalPoints ??
    assignment.maxScore ??
    100;

  const formattedDate = assignment.dueDate
    ? `Tenggat: ${new Date(assignment.dueDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : assignment.createdAt
      ? `Dibuat: ${new Date(assignment.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`
      : "";

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Breadcrumb & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer mr-1"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali</span>
          </button>
          {userRole === "kepsek" && (
            <>
              <Link href="/kepsek/teachers" className="hover:text-blue-600 transition">
                Monitor Kinerja Guru
              </Link>
              <ChevronRight className="size-3 text-slate-300" />
            </>
          )}
          {userRole === "admin" && (
            <>
              <Link href="/admin/classes" className="hover:text-blue-600 transition">
                Manajemen Kelas
              </Link>
              <ChevronRight className="size-3 text-slate-300" />
            </>
          )}
          <Link
            href={classBackHref}
            className="hover:text-blue-600 transition font-semibold"
          >
            {className}
          </Link>
          <ChevronRight className="size-3 text-slate-300" />
          <span className="text-blue-600 font-semibold truncate max-w-md">
            {assignment.title}
          </span>
        </div>
      </div>

      {/* Main Grid: Content on Left (8 cols), Kolom Komentar on Right (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                  isQuiz
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {isQuiz ? (
                  <HelpCircle className="size-6" />
                ) : (
                  <FileText className="size-6" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      isQuiz
                        ? "bg-blue-100 text-blue-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {isQuiz ? "Ulangan Harian / Kuis" : "Tugas"}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                  {assignment.title}
                </h1>
                {formattedDate && (
                  <p className="text-xs text-slate-500">{formattedDate}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-slate-900">
                    Skala Nilai Akhir: {assignment.maxScore || 100} Poin
                  </span>
                  {isQuiz && (
                    <>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        Total Skor Mentah: {maxRawScore} Poin ({quizQuestions.length} Soal)
                      </span>
                      {assignment.quizId?.durationSeconds && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                          <Clock className="size-3.5 text-slate-400" />
                          {assignment.quizId.durationSeconds} Detik
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status toggle & "Lihat Submisi" Button */}
            <div className="flex flex-wrap items-center gap-2">
              {isReadOnlyRole ? (
                <span className="rounded-xl px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Mode Pratinjau (Read-Only)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  title="Klik untuk mengubah status publikasi"
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                    assignment.isPublished !== false
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {assignment.isPublished !== false ? "● AKTIF" : "○ DRAFT"}
                </button>
              )}

              <Link href={`/guru/assignments/${id}/submissions`}>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition inline-flex items-center gap-1.5"
                >
                  <Users className="size-3.5 text-blue-600" />
                  <span>Lihat Submisi ({assignment.turnedInCount ?? 0})</span>
                </button>
              </Link>

              {canManageContent && (
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 shadow-xs hover:bg-red-100 transition inline-flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  <span>{isQuiz ? "Hapus Kuis" : "Hapus Tugas"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Description / Instructions text */}
          <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {assignment.instructions ||
              assignment.description ||
              assignment.quizId?.description ||
              (isQuiz
                ? "Kuis CBT siap dikerjakan oleh siswa di kelas ini."
                : "Silahkan dikerjakan sesuai instruksi yang diberikan.")}
          </div>

          {/* Quiz Questions Review Section (shown when item is a Quiz) */}
          {isQuiz && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="size-4 text-blue-600" />
                  <span>Daftar Soal Kuis ({quizQuestions.length} Soal)</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Nilai akhir siswa otomatis dinormalisasi ke skala 0–100
                </span>
              </div>

              {quizQuestions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                  Belum ada soal yang terdaftar pada kuis ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {quizQuestions.map((q, qIdx) => {
                    const isEssay = q.type === "essay";
                    const correctIndex =
                      typeof q.correctAnswer === "number"
                        ? q.correctAnswer
                        : OPTION_LETTERS.indexOf(String(q.correctAnswer || "A").toUpperCase());

                    return (
                      <div
                        key={q.id || qIdx}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700">
                              Soal {qIdx + 1}
                            </span>
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {isEssay ? "Essay" : "Pilihan Ganda"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              <Award className="size-3.5" />
                              PT: {q.points ?? 10} Poin
                            </span>
                            {typeof q.pointsFalse === "number" && (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                                PF: {q.pointsFalse}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                          {q.question}
                        </p>

                        {!isEssay && Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((optText, optIdx) => {
                              const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
                              const isCorrectOpt = optIdx === correctIndex;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                                    isCorrectOpt
                                      ? "border-emerald-300 bg-emerald-50/70 font-bold text-emerald-900"
                                      : "border-slate-200 bg-slate-50/50 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-extrabold ${
                                        isCorrectOpt
                                          ? "bg-emerald-600 text-white"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className="truncate">{optText}</span>
                                  </div>
                                  {isCorrectOpt && (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* File yang dibagi Section */}
          {(!isQuiz || attachments.length > 0) && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">File yang dibagi</h3>
              {attachments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada file yang dibagikan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {file.size || "-"} • {file.type || "file"}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/api/files/download?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`}
                        download
                        className="p-2 text-slate-400 hover:text-blue-600 transition"
                        title="Unduh file"
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Student Submission Status & Grades Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="size-4 text-blue-600" />
                  <span>Status Pengumpulan &amp; Nilai Siswa</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ringkasan progres pengumpulan dan capaian nilai siswa pada {isQuiz ? "kuis" : "tugas"} ini.
                </p>
              </div>
              <Link
                href={`/guru/assignments/${id}/submissions`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
              >
                <span>Buka Panel Submisi</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </div>

            {/* Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Siswa
                </span>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {submissionStats?.totalStudents ?? submissionItems.length}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Diserahkan
                </span>
                <p className="mt-1 text-lg font-extrabold text-blue-700">
                  {(submissionStats?.turnedInCount ?? 0) + (submissionStats?.gradedCount ?? 0) ||
                    (assignment.turnedInCount ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Sudah Dinilai
                </span>
                <p className="mt-1 text-lg font-extrabold text-emerald-700">
                  {submissionStats?.gradedCount ?? assignment.gradedCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Belum Mengumpulkan
                </span>
                <p className="mt-1 text-lg font-extrabold text-amber-700">
                  {submissionStats?.assignedCount ??
                    Math.max(0, submissionItems.filter((s) => s.status === "assigned").length)}
                </p>
              </div>
            </div>

            {/* Student Submissions Table */}
            {submissionItems.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">
                Belum ada data daftar siswa atau pengumpulan untuk ditampilkan.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3.5 py-2.5">Siswa</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Waktu Kumpul</th>
                      <th className="px-3.5 py-2.5 text-right">Nilai / Hasil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissionItems.map((item) => {
                      const isGraded = item.status === "graded";
                      const isTurnedIn = item.status === "turned_in";
                      const isLate = item.status === "late";
                      const displayScore = item.normalizedScore ?? item.score;

                      return (
                        <tr key={item.student._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-3.5 py-2.5">
                            <p className="font-bold text-slate-900">{item.student.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">
                              NISN: {item.student.nisn || "-"}
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5">
                            {item.isPendingManual || item.gradingStatus === "pending_manual" ? (
                              <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Perlu Nilai Essay
                              </span>
                            ) : isGraded ? (
                              <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Sudah Dinilai
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Terlambat
                              </span>
                            ) : isTurnedIn ? (
                              <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                Diserahkan
                              </span>
                            ) : (
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                Belum Mengumpulkan
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500">
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {displayScore !== null && displayScore !== undefined ? (
                              <div>
                                <span className="font-extrabold text-emerald-700">
                                  {displayScore} / {assignment.maxScore || 100}
                                </span>
                                {isQuiz &&
                                  typeof item.rawScore === "number" &&
                                  typeof item.maxRawScore === "number" && (
                                    <p className="text-[10px] text-slate-400">
                                      Mentah: {item.rawScore}/{item.maxRawScore}
                                    </p>
                                  )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Kolom Komentar */}
        <div className="lg:col-span-4">
          <ThreadedComments
            comments={comments}
            currentUserId={assignment.currentUserId}
            currentUserRole={userRole}
            apiEndpoint={`/api/guru/assignments/${id}/comments`}
            onCommentsUpdated={(updated) => setComments(updated)}
            canComment={canComment}
            title="Kolom Komentar"
          />
        </div>
      </div>

      {/* Floating Action Button at Bottom Right: Blue Circular Edit/Pencil */}
      {canManageContent && (
        <div className="fixed bottom-6 right-8 z-40">
          <Link
            href={`/guru/assignments/${id}/edit`}
            title={isQuiz ? "Edit Kuis" : "Edit Tugas"}
            className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
          >
            <Pencil className="size-5" />
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isQuiz ? "Hapus Kuis" : "Hapus Tugas"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {assignment.title}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Yakin ingin menghapus {isQuiz ? "kuis" : "tugas"} ini?
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Item yang dihapus tidak akan ditampilkan lagi di aliran kelas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAssignment}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
