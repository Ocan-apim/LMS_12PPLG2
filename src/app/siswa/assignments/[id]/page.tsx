"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Award,
  BookOpen,
  User,
  Paperclip,
  Download,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Loader2,
  RefreshCw,
  Send,
  MessageSquare,
  X,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Attachment {
  name: string;
  url: string;
  type?: string;
  size?: string;
  uploadedAt?: string;
}

interface CommentItem {
  _id?: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: string;
}

interface AssignmentDetail {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  type: string;
  maxScore: number;
  dueDate?: string;
  bannerUrl?: string;
  bannerColor: string;
  teacher: {
    _id?: string;
    name: string;
    email?: string;
    degree?: string;
  };
  courseClass: {
    _id: string;
    name: string;
    code: string;
    bannerColor: string;
  };
  subject: {
    _id?: string;
    name: string;
    category?: string;
  };
  attachments: Attachment[];
  submissionStatus: "assigned" | "turned_in" | "late" | "graded";
  submission?: {
    _id: string;
    status: "assigned" | "turned_in" | "late" | "graded";
    score?: number | null;
    feedback?: string | null;
    content?: string;
    fileUrl?: string;
    attachments: Attachment[];
    submittedAt?: string;
    gradedAt?: string | null;
  } | null;
  comments: CommentItem[];
  isStaffView?: boolean;
  currentUserRole?: string;
}

export default function SiswaAssignmentDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  // Submission Form State
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [submissionFiles, setSubmissionFiles] = useState<Attachment[]>([]);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Fetch Assignment Detail
  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/siswa/assignments/${id}`);
      setStatusCode(res.status);

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Akses ditolak: Anda tidak terdaftar di kelas tugas ini.");
        }
        if (res.status === 404) {
          throw new Error("Tugas tidak ditemukan atau telah diarsipkan.");
        }
        throw new Error("Gagal memuat detail tugas.");
      }

      const data = await res.json();
      if (data.success && data.data) {
        setAssignment(data.data);
        setComments(data.data.comments || []);
        if (data.data.submission) {
          setSubmissionFiles(data.data.submission.attachments || []);
          setSubmissionNotes(data.data.submission.content || "");
        }
      } else {
        throw new Error(data.message || "Gagal memproses data tugas.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  // Handle File Upload via POST /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setSubmitError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", "submissions");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.message || `Gagal mengunggah file ${file.name}`);
        }

        const uploadedAttachment: Attachment = {
          name: uploadData.data.name || file.name,
          url: uploadData.data.url,
          type: uploadData.data.type || "document",
          size: uploadData.data.size || "1.0 MB",
          uploadedAt: new Date().toISOString(),
        };

        setSubmissionFiles((prev) => [...prev, uploadedAttachment]);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengunggah file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeSubmissionFile = (index: number) => {
    setSubmissionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Assignment Submission via POST /api/siswa/assignments/[id]/submit
  const handleSubmitAssignment = async () => {
    if (submissionFiles.length === 0 && !submissionNotes.trim()) {
      setSubmitError("Harap lampirkan minimal 1 file atau tuliskan catatan tugas.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/siswa/assignments/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: submissionFiles,
          content: submissionNotes.trim(),
          fileUrl: submissionFiles[0]?.url || "",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengumpulkan tugas.");
      }

      setSubmitSuccess(data.message || "Tugas berhasil dikumpulkan!");
      setIsResubmitting(false);
      // Refresh assignment detail to get updated submission state
      await fetchAssignment();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengumpulkan tugas.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Post Comment via /api/guru/assignments/[id]/comments
  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/guru/assignments/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengirim komentar.");
      }

      if (data.data) {
        setComments((prev) => [...prev, data.data]);
      }
      setNewComment("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim komentar.");
    } finally {
      setCommentLoading(false);
    }
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
          Anda tidak terdaftar sebagai peserta pada kelas mata pelajaran ini, sehingga tidak dapat mengakses tugas ini.
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
          Tugas Tidak Ditemukan (404)
        </h1>
        <p className="max-w-md text-sm text-slate-600">
          Tugas ini mungkin telah dihapus, diarsipkan, atau tautan yang Anda masukkan tidak valid.
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

  // Render Generic Error State
  if (!loading && error && !assignment) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-red-100 text-red-600 shadow-sm">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Gagal Memuat Tugas</h1>
        <p className="max-w-md text-sm text-slate-600">{error}</p>
        <button
          onClick={fetchAssignment}
          className="inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
        >
          <RefreshCw className="size-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  // Render Loading State
  if (loading || !assignment) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-10 animate-spin text-[#674ce7]" />
        <p className="text-sm font-semibold text-slate-600">Memuat rincian tugas...</p>
      </div>
    );
  }

  // Calculations for Deadline & Status
  const isSubmitted = Boolean(
    assignment.submission && ["turned_in", "late", "graded"].includes(assignment.submission.status)
  );
  const isGraded = assignment.submission?.status === "graded";
  const isPastDue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

  const formattedDueDate = assignment.dueDate
    ? new Date(assignment.dueDate).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Tidak ada batas waktu";

  return (
    <div className="animate-fade-up px-2 pb-12">
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[#674ce7] cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4edff] px-3 py-1.5 text-xs font-bold text-[#674ce7]">
            <BookOpen className="size-3.5" />
            {assignment.courseClass.name}
          </span>
        </div>
      </div>

      {/* Staff Read-Only Notice Banner */}
      {assignment.isStaffView && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-center shadow-xs">
          <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Mode Pratinjau Staf ({assignment.currentUserRole?.toUpperCase() || "BACA-SAJA"}) &bull; Baca-Saja
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            Anda memantau detail tugas ini dalam mode pratinjau baca-saja. Anda dapat membaca petunjuk, mengunduh file lampiran materi dari guru, serta membaca diskusi. Pengunggahan berkas jawaban dan pengumpulan tugas dinonaktifkan.
          </p>
        </div>
      )}

      {/* Main Grid: Left Column (Details) & Right Column (Submission Card) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.8fr_1fr]">
        {/* Left Column: Task Info & Content */}
        <div className="space-y-6">
          {/* Header Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#674ce7]">
              <span className="rounded-md bg-[#eee9ff] px-2.5 py-1 uppercase tracking-wide">
                {assignment.subject.name}
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-600">
                Kelas: {assignment.courseClass.name}
              </span>
            </div>

            <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {assignment.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-6 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <User className="size-4 text-slate-400" />
                <span>
                  Guru: <strong className="text-slate-800">{assignment.teacher.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-slate-400" />
                <span>
                  Tenggat:{" "}
                  <strong className={isPastDue && !isSubmitted ? "text-red-600" : "text-slate-800"}>
                    {formattedDueDate}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="size-4 text-slate-400" />
                <span>
                  Maksimal: <strong className="text-slate-800">{assignment.maxScore} Poin</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Description & Instructions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-[family-name:var(--font-display)] text-base font-extrabold text-slate-900">
              Petunjuk Pengerjaan
            </h2>
            <div className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {assignment.instructions || assignment.description || (
                <span className="italic text-slate-400">Tidak ada instruksi khusus dari guru.</span>
              )}
            </div>

            {/* Teacher's Attachments */}
            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <Paperclip className="size-4 text-[#674ce7]" />
                  Lampiran dari Guru ({assignment.attachments.length})
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {assignment.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eee9ff] text-[#674ce7]">
                          <FileText className="size-4" />
                        </span>
                        <div className="overflow-hidden">
                          <p className="truncate text-xs font-semibold text-slate-800">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{file.size || "1.0 MB"}</p>
                        </div>
                      </div>
                      <a
                        href={`/api/files/download?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`}
                        download={file.name}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-[#674ce7] hover:shadow-xs"
                        title="Unduh File"
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discussion & Comments Area */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-extrabold text-slate-900">
              <MessageSquare className="size-4 text-[#674ce7]" />
              Diskusi & Komentar Tugas ({comments.length})
            </h2>

            {/* Comment List */}
            <div className="mt-4 space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="py-6 text-center text-xs italic text-slate-400">
                  Belum ada komentar pada tugas ini. Ajukan pertanyaan jika ada yang belum jelas!
                </p>
              ) : (
                comments.map((c, idx) => (
                  <div key={c._id || idx} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{c.userName}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            c.userRole === "guru"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {c.userRole}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 leading-relaxed">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            {!assignment.isStaffView ? (
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !commentLoading && handlePostComment()}
                  placeholder="Tulis pertanyaan atau komentar di sini..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#674ce7] focus:outline-hidden"
                />
                <button
                  onClick={handlePostComment}
                  disabled={commentLoading || !newComment.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#674ce7] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#563cd6] disabled:opacity-50"
                >
                  {commentLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Kirim
                </button>
              </div>
            ) : (
              <div className="mt-4 border-t border-slate-100 pt-3 text-center">
                <p className="text-[11px] text-slate-400 italic">
                  Penulisan komentar dinonaktifkan untuk akun peninjau staf (baca-saja).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Submission Card */}
        <div className="space-y-6">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-[family-name:var(--font-display)] text-base font-extrabold text-slate-900">
                {assignment.isStaffView ? "Informasi Tugas" : "Tugas Anda"}
              </h2>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
                  assignment.isStaffView
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : isGraded
                    ? "bg-[#d4f8ec] text-[#00796f]"
                    : isSubmitted
                      ? assignment.submission?.status === "late"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-[#eee9ff] text-[#674ce7]"
                      : isPastDue
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {assignment.isStaffView ? (
                  <>Mode Pratinjau</>
                ) : isGraded ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    Dinilai
                  </>
                ) : isSubmitted ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    {assignment.submission?.status === "late" ? "Terlambat" : "Diserahkan"}
                  </>
                ) : isPastDue ? (
                  <>
                    <Clock3 className="size-3" />
                    Terlambat
                  </>
                ) : (
                  <>
                    <Clock3 className="size-3" />
                    Ditugaskan
                  </>
                )}
              </span>
            </div>

            {/* Score & Teacher Feedback if Graded */}
            {!assignment.isStaffView && isGraded && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-[#f4fbf8] p-4 text-emerald-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Nilai Diperoleh
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-black text-[#00796f]">
                    {assignment.submission?.score} / {assignment.maxScore}
                  </span>
                </div>
                {assignment.submission?.feedback && (
                  <div className="mt-3 border-t border-emerald-200/60 pt-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                      Catatan Guru:
                    </p>
                    <p className="mt-1 text-xs italic text-emerald-950">
                      &ldquo;{assignment.submission.feedback}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Alerts */}
            {submitError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
                <span>{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Staff Read-Only Info Block */}
            {assignment.isStaffView ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Tenggat Waktu:</span>
                    <span className="font-bold text-slate-800">{formattedDueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Poin Maksimal:</span>
                    <span className="font-bold text-[#674ce7]">{assignment.maxScore} Poin</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Guru Pengampu:</span>
                    <span className="font-bold text-slate-800">{assignment.teacher.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Kelas Mapel:</span>
                    <span className="font-bold text-slate-800">{assignment.courseClass.name}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <p className="text-xs font-bold text-amber-800">
                    Mode Pratinjau Staf (Baca-Saja)
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    Pengunggahan berkas jawaban dan formulir penyerahan tugas dinonaktifkan.
                  </p>
                </div>
              </div>
            ) : isSubmitted && !isResubmitting ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500">Waktu Pengumpulan:</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {assignment.submission?.submittedAt
                      ? new Date(assignment.submission.submittedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </p>
                </div>

                {/* Submitted Files */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    File Terlampir ({assignment.submission?.attachments.length || 0})
                  </p>
                  <div className="mt-2 space-y-2">
                    {assignment.submission?.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className="size-4 shrink-0 text-[#674ce7]" />
                          <span className="truncate text-xs font-medium text-slate-800">{file.name}</span>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="grid size-7 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-[#674ce7]"
                          title="Buka File"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submitted Notes */}
                {assignment.submission?.content && (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                      Catatan Siswa:
                    </p>
                    <p className="mt-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed border border-slate-100">
                      {assignment.submission.content}
                    </p>
                  </div>
                )}

                {/* Re-submit Button (allowed if not yet graded) */}
                {!isGraded && (
                  <button
                    onClick={() => setIsResubmitting(true)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-[#674ce7] hover:text-[#674ce7]"
                  >
                    Ubah / Kumpulkan Ulang
                  </button>
                )}
              </div>
            ) : (
              /* State B: Not Submitted OR Re-submitting Form */
              <div className="mt-5 space-y-4">
                {/* Upload Dropzone */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-2">
                    Unggah File Tugas
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d9cfee] bg-[#fbf8ff] p-5 text-center transition hover:border-[#674ce7] hover:bg-[#f6f0ff]"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                    />
                    <UploadCloud className="size-8 text-[#674ce7]" />
                    <p className="mt-2 text-xs font-bold text-slate-800">
                      Klik untuk memilih file
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      PDF, DOCX, ZIP, PNG, JPG (Maks. 25MB)
                    </p>
                  </div>
                </div>

                {/* Uploading Spinner */}
                {uploading && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-purple-50 p-3 text-xs font-semibold text-[#674ce7]">
                    <Loader2 className="size-4 animate-spin" />
                    Sedang mengunggah file...
                  </div>
                )}

                {/* Attached Files List */}
                {submissionFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                      File Dipilih ({submissionFiles.length}):
                    </p>
                    {submissionFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="size-4 shrink-0 text-[#674ce7]" />
                          <span className="truncate font-medium text-slate-800">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSubmissionFile(idx)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes Input */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1">
                    Catatan / Link Jawaban (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Tuliskan catatan atau tautan GitHub / Google Drive jika diperlukan..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#674ce7] focus:outline-hidden"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isResubmitting && (
                    <button
                      type="button"
                      onClick={() => setIsResubmitting(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmitAssignment}
                    disabled={submitting || uploading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#674ce7] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#563cd6] disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Menyerahkan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        {isSubmitted ? "Simpan Perubahan" : "Serahkan Tugas"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FooterBar />
    </div>
  );
}
