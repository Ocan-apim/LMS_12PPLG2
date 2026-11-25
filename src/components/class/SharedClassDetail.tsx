"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  FileArchive,
  PlaySquare,
  Download,
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  GraduationCap,
  ShieldAlert,
  HelpCircle,
  Send,
  Users,
  ExternalLink,
  CornerDownRight,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Reply,
} from "lucide-react";
import { validateComment } from "@/lib/profanity-filter";

interface StudentInfo {
  _id: string;
  name: string;
  nisn: string;
  email: string;
  gender: string;
}

interface SiblingClass {
  _id: string;
  name: string;
  code: string;
  subjectName: string;
  teacherName: string;
}

interface AssignmentItem {
  _id: string;
  title: string;
  description?: string;
  type: "tugas";
  dueDate?: string;
  maxScore: number;
  submissionStatus: "assigned" | "turned_in" | "late" | "graded";
  score?: number | null;
  submittedAt?: string | null;
  createdAt?: string;
}

interface QuizItem {
  _id: string;
  title: string;
  description?: string;
  type: "kuis";
  dueDate?: string;
  maxScore: number;
  totalQuestions: number;
  durationSeconds: number;
  submissionStatus: "assigned" | "turned_in" | "late" | "graded";
  score?: number | null;
  submittedAt?: string | null;
  createdAt?: string;
}

interface PostCommentItem {
  _id?: string;
  userId: string;
  userName: string;
  userRole?: string;
  message: string;
  parentId?: string | null;
  isDeleted?: boolean;
  createdAt: string;
}

interface PostItem {
  _id: string;
  type: "announcement" | "assignment" | "quiz";
  title: string;
  content?: string;
  teacherId?: {
    name: string;
    degree?: string;
  };
  comments?: PostCommentItem[];
  createdAt: string;
}

interface FileItem {
  name: string;
  url: string;
  type?: string;
  size?: string;
  uploadedAt?: string;
}

interface ClassDetailData {
  _id: string;
  name: string;
  code: string;
  bannerColor: string;
  academicYear: string;
  teacher?: {
    name: string;
    email?: string;
    degree?: string;
  };
  subject?: {
    name: string;
    category?: string;
  };
  rombel?: {
    _id: string;
    name: string;
    grade?: string;
  };
  students: StudentInfo[];
  studentCount: number;
  enrollmentMonitoring?: {
    rombelId: string | null;
    rombelName: string;
    totalActiveRombelStudents: number;
    enrolledCount: number;
    missingCount: number;
    completionPercentage: number;
    enrollmentStatus: "Complete" | "Incomplete" | "No active students" | "Unassigned";
    enrolledStudents: Array<{
      _id: string;
      name: string;
      nis: string;
      nisn: string;
      email: string;
      rombelName: string;
    }>;
    missingStudents: Array<{
      _id: string;
      name: string;
      nis: string;
      nisn: string;
      email: string;
      rombelName: string;
    }>;
  };
  assignments: AssignmentItem[];
  quizzes: QuizItem[];
  posts: PostItem[];
  materials: Array<{
    _id: string;
    title: string;
    description?: string;
    attachments?: FileItem[];
  }>;
  sharedFiles: FileItem[];
  siblingClasses?: SiblingClass[];
  isReadOnly?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
  noCourseClass?: boolean;
}

interface SharedClassDetailProps {
  classId: string;
  mode?: "student" | "readonly" | "admin";
  role?: "siswa" | "admin" | "kurikulum" | "kepsek" | "guru";
  backHref?: string;
  backLabel?: string;
  onCourseChange?: (courseId: string) => void;
  onCourseDeleted?: () => void;
}

export function SharedClassDetail({
  classId,
  mode = "student",
  role,
  backHref,
  backLabel,
  onCourseChange,
  onCourseDeleted,
}: SharedClassDetailProps) {
  const router = useRouter();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [course, setCourse] = useState<ClassDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Classroom Discussion / Comment states (Task 6)
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    parentId: string;
    postId: string;
    authorName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Admin Content & Classroom Deletion states (Task 4 & Task 6)
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<{
    type: "assignment" | "quiz" | "material";
    id: string;
    title: string;
  } | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const fetchClassDetail = async (targetCourseId?: string) => {
    try {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      const endpoint = targetCourseId
        ? `/api/siswa/courses/${classId}?courseClassId=${targetCourseId}`
        : `/api/siswa/courses/${classId}`;

      const res = await fetch(endpoint);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorStatus(res.status);
        throw new Error(json.message || "Gagal memuat detail kelas");
      }
      setCourse(json.data);
      if (json.data._id) {
        setActiveCourseId(json.data._id);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClassDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleSelectSibling = (courseId: string) => {
    setActiveCourseId(courseId);
    fetchClassDetail(courseId);
    if (onCourseChange) {
      onCourseChange(courseId);
    }
  };

  const userRole = role || course?.currentUserRole || "siswa";
  // TASK 6: Mode Pratinjau Staf (Baca-Saja) applies ONLY to Kurikulum and Kepsek (NOT Admin!)
  const isReadOnly =
    mode === "readonly" || ["kurikulum", "kepsek"].includes(userRole);
  const isAdmin = userRole === "admin";

  // Determine back navigation based on role/props
  const defaultBackHref =
    backHref ||
    (userRole === "admin"
      ? "/admin/classes"
      : userRole === "kurikulum"
      ? "/kurikulum/grades/classes"
      : userRole === "kepsek"
      ? "/kepsek/teachers"
      : "/siswa/courses");

  const defaultBackLabel =
    backLabel ||
    (userRole === "admin"
      ? "Manajemen Kelas"
      : userRole === "kurikulum"
      ? "Data Kelas"
      : userRole === "kepsek"
      ? "Monitor Guru"
      : "Mata Pelajaran");

  const handleAddClassComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !commentText.trim() || submittingComment || isReadOnly) return;
    setCommentError(null);

    const validation = validateComment(commentText);
    if (!validation.isValid) {
      setCommentError(
        validation.message ||
          "Komentar tidak dapat dikirim karena mengandung kata yang tidak pantas."
      );
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/guru/classes/${course._id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          postId: "general",
          message: commentText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCommentError(json.message || "Gagal mengirim komentar");
        return;
      }
      setCommentText("");
      await fetchClassDetail(activeCourseId || course._id);
    } catch {
      setCommentError("Terjadi kesalahan koneksi saat mengirim komentar");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !replyingTo || !replyText.trim() || submittingReply || isReadOnly) {
      return;
    }
    setReplyError(null);

    const validation = validateComment(replyText);
    if (!validation.isValid) {
      setReplyError(
        validation.message ||
          "Balasan tidak dapat dikirim karena mengandung kata yang tidak pantas."
      );
      return;
    }

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/guru/classes/${course._id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          postId: replyingTo.postId || "general",
          parentId: replyingTo.parentId,
          message: replyText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setReplyError(json.message || "Gagal mengirim balasan");
        return;
      }
      setReplyText("");
      setReplyingTo(null);
      await fetchClassDetail(activeCourseId || course._id);
    } catch {
      setReplyError("Terjadi kesalahan koneksi saat mengirim balasan");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId?: string) => {
    if (!course || !commentId || deletingCommentId || isReadOnly) return;
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(
        `/api/guru/classes/${course._id}/posts?commentId=${encodeURIComponent(commentId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchClassDetail(activeCourseId || course._id);
      } else {
        alert(json.message || "Gagal menghapus komentar");
      }
    } catch {
      alert("Terjadi kesalahan koneksi saat menghapus komentar");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleConfirmDeleteMapelClass = async () => {
    if (!course || deletingClass) return;
    setDeletingClass(true);
    try {
      const res = await fetch(`/api/guru/classes/${course._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menghapus Kelas Mapel");
        return;
      }
      setDeleteClassModalOpen(false);
      if (onCourseDeleted) {
        onCourseDeleted();
      } else {
        router.push(defaultBackHref);
      }
    } catch {
      alert("Terjadi kesalahan koneksi saat menghapus Kelas Mapel");
    } finally {
      setDeletingClass(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!course || !deleteItemTarget || deletingItem) return;
    setDeletingItem(true);
    try {
      let endpoint = "";
      if (deleteItemTarget.type === "assignment") {
        endpoint = `/api/guru/assignments/${deleteItemTarget.id}`;
      } else if (deleteItemTarget.type === "quiz") {
        endpoint = `/api/guru/quizzes/${deleteItemTarget.id}`;
      } else {
        endpoint = `/api/guru/classes/${course._id}/materials?materialId=${encodeURIComponent(
          deleteItemTarget.id
        )}`;
      }

      const res = await fetch(endpoint, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menghapus item kelas");
        return;
      }
      setDeleteItemTarget(null);
      await fetchClassDetail(activeCourseId || course._id);
    } catch {
      alert("Terjadi kesalahan koneksi saat menghapus item kelas");
    } finally {
      setDeletingItem(false);
    }
  };

  if (loading && !course) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#0066FF]" />
        <p className="text-sm font-semibold text-slate-500">Memuat detail kelas...</p>
      </div>
    );
  }

  // 403 Forbidden
  if (errorStatus === 403) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center mt-12 animate-in fade-in">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Akses Ditolak</h2>
        <p className="mt-2 text-sm text-slate-600">
          {errorMessage || "Anda belum memiliki hak akses untuk membuka kelas ini."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={defaultBackHref}
            className="rounded-xl bg-[#0066FF] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0052cc] transition"
          >
            Kembali ke {defaultBackLabel}
          </Link>
        </div>
      </div>
    );
  }

  // 404 Not Found
  if (errorStatus === 404 || !course) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center mt-12 animate-in fade-in">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Kelas Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-slate-600">
          {errorMessage || "Kelas yang Anda tuju tidak tersedia atau belum aktif."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={defaultBackHref}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-700 transition"
          >
            Kembali ke {defaultBackLabel}
          </Link>
          <button
            onClick={() => fetchClassDetail()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="size-4" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const teacherName = course.teacher
    ? `${course.teacher.name}${course.teacher.degree ? `, ${course.teacher.degree}` : ""}`
    : "Guru Pengampu";

  // Aggregate all comments from class posts
  const allComments = (course.posts || [])
    .flatMap((post) =>
      (post.comments || []).map((c) => ({
        ...c,
        postId: post._id,
      }))
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Single-level threaded grouping: top-level comments and replies
  const topLevelComments = allComments.filter((c) => !c.parentId);
  const repliesByParentId = new Map<string, typeof allComments>();
  for (const c of allComments) {
    if (c.parentId) {
      const pid = String(c.parentId);
      if (!repliesByParentId.has(pid)) {
        repliesByParentId.set(pid, []);
      }
      repliesByParentId.get(pid)!.push(c);
    }
  }

  const currentUserId = course.currentUserId;
  const canDeleteComment = (c: { userId: string; isDeleted?: boolean }) => {
    if (isReadOnly || c.isDeleted) return false;
    if (userRole === "admin") return true;
    if (userRole === "guru") return true;
    if (userRole === "siswa" && currentUserId && String(c.userId) === String(currentUserId)) {
      return true;
    }
    return false;
  };

  const siblings = course.siblingClasses || [];
  const students = course.students || [];

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link
          href={defaultBackHref}
          className="hover:text-[#0066FF] flex items-center gap-1 transition"
        >
          <ChevronLeft className="size-4" />
          {defaultBackLabel}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">
          {course.rombel ? `${course.rombel.name} - ` : ""}
          {course.name}
        </span>
      </div>

      {/* Staff Read-Only Notice Banner (ONLY for Kurikulum & Kepsek, NOT Admin) */}
      {isReadOnly && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-center shadow-xs">
          <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Mode Pratinjau Staf (Baca-Saja)
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            Anda memantau aktivitas kelas mapel ini secara menyeluruh (Tugas, Ulangan Harian,
            Komentar, dan Daftar Siswa). Seluruh aksi mutasi, pengunggahan jawaban, dan komentar
            dinonaktifkan.
          </p>
        </div>
      )}

      {/* Sibling Course Class Switcher (for Rombel with multiple mapel) */}
      {siblings.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pilih Mata Pelajaran di Kelas {course.rombel?.name || "Ini"}:
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {siblings.length} Mapel Terbuka
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {siblings.map((sc) => {
              const isSelected = String(sc._id) === String(activeCourseId || course._id);
              return (
                <button
                  key={sc._id}
                  type="button"
                  onClick={() => handleSelectSibling(sc._id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <BookOpen className="size-3.5" />
                  <span>{sc.name}</span>
                  <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                    ({sc.teacherName.split(",")[0]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero Banner Header matching Figma PWPB banner */}
      <div className="relative min-h-[160px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#20103f] via-[#4d32a8] to-[#6d4ee9] p-8 text-white shadow-sm flex flex-col justify-end">
        <div className="absolute right-[-40px] top-[-40px] size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                {course.subject?.category || "Kejuruan"}
              </span>
              {course.rombel?.name && (
                <span className="rounded bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  {course.rombel.name}
                </span>
              )}
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.02em]">
              {course.name}
            </h1>
            <p className="mt-1 text-sm font-medium text-purple-100 flex items-center gap-2">
              <GraduationCap className="size-4" />
              {teacherName}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setDeleteClassModalOpen(true)}
              className="inline-flex items-center gap-1.5 self-start sm:self-end rounded-xl bg-rose-500/90 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Hapus Kelas Mapel</span>
            </button>
          )}
        </div>
      </div>

      {/* Aktivitas Kelas */}
      <div className="space-y-6">
        {/* CONTENT / TUGAS & KUIS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="size-5 text-[#0066FF]" />
              Aktivitas Kelas
            </h2>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                {course.assignments.length} Tugas
              </span>
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                {(course.quizzes || []).length} Ulangan Harian
              </span>
            </div>
          </div>

          {/* List of Activities */}
          <div className="space-y-4">
            {course.assignments.length === 0 && (course.quizzes || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 shadow-xs">
                <FileText className="mx-auto size-10 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  Belum ada aktivitas di kelas ini.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Guru pengampu belum mempublikasikan tugas atau kuis untuk kelas ini.
                </p>
              </div>
            ) : (
              <>
                {/* 1. QUIZ / ULANGAN HARIAN (Blue Container) */}
                {(course.quizzes || []).map((quiz) => {
                  const dueText = quiz.dueDate
                    ? new Date(quiz.dueDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Tanpa batas waktu";

                  const isDone =
                    quiz.submissionStatus === "turned_in" ||
                    quiz.submissionStatus === "graded";

                  const isStaffOrTeacher = ["admin", "kurikulum", "kepsek", "guru"].includes(
                    userRole
                  );
                  const targetUrl = isStaffOrTeacher
                    ? `/guru/quizzes/${quiz._id}`
                    : `/siswa/quiz/${quiz._id}`;

                  return (
                    <div
                      key={quiz._id}
                      onClick={() => router.push(targetUrl)}
                      className="group block cursor-pointer rounded-2xl border border-blue-600 bg-[#2563eb] p-5 text-white shadow-xs transition hover:bg-[#1d4ed8] hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
                            <HelpCircle className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                                Ulangan Harian
                              </span>
                              <span className="text-[11px] text-blue-100 flex items-center gap-1">
                                <Clock className="size-3" />
                                {Math.round((quiz.durationSeconds || 60) / 60)} Menit &bull;{" "}
                                {quiz.totalQuestions || 0} Soal
                              </span>
                            </div>
                            <h3 className="mt-1 text-base font-extrabold text-white leading-snug group-hover:underline">
                              {quiz.title}
                            </h3>
                            {quiz.description && (
                              <p className="mt-1 text-xs text-blue-100 line-clamp-2">
                                {quiz.description}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-blue-100 flex items-center gap-1.5 font-medium">
                              <Calendar className="size-3.5 text-blue-200" />
                              <span>Deadline: {dueText}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge & Action Buttons */}
                        <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          <span
                            className={`rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider shadow-xs ${
                              isStaffOrTeacher
                                ? "bg-white/20 text-white backdrop-blur-xs"
                                : isDone
                                ? "bg-white text-blue-700"
                                : quiz.submissionStatus === "late"
                                ? "bg-rose-500 text-white"
                                : "bg-white/25 text-white backdrop-blur-xs"
                            }`}
                          >
                            {isStaffOrTeacher
                              ? `${quiz.totalQuestions || 0} Soal`
                              : isDone
                              ? quiz.score !== null && quiz.score !== undefined
                                ? `Nilai: ${quiz.score}`
                                : "Selesai"
                              : quiz.submissionStatus === "late"
                              ? "Terlambat"
                              : "Belum dikerjakan"}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteItemTarget({
                                  type: "quiz",
                                  id: quiz._id,
                                  title: quiz.title,
                                });
                              }}
                              title={`Hapus Kuis ${quiz.title}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-500/90 hover:bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>Hapus</span>
                            </button>
                          )}
                          <Link
                            href={targetUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-xs transition hover:bg-blue-50"
                          >
                            <span>Detail</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 2. TUGAS (White Container) */}
                {course.assignments.map((assignment) => {
                  const dueText = assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Tanpa batas waktu";

                  const isStaffOrTeacher = ["admin", "kurikulum", "kepsek", "guru"].includes(
                    userRole
                  );
                  const targetUrl = isStaffOrTeacher
                    ? `/guru/assignments/${assignment._id}`
                    : `/siswa/assignments/${assignment._id}`;

                  return (
                    <div
                      key={assignment._id}
                      onClick={() => router.push(targetUrl)}
                      className="group block cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xs transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <FileText className="size-5" />
                          </div>
                          <div>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                              Tugas
                            </span>
                            <h3 className="mt-1 text-base font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition">
                              {assignment.title}
                            </h3>
                            {assignment.description && (
                              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                {assignment.description}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                              <Calendar className="size-3.5 text-slate-400" />
                              <span>Deadline: {dueText}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge & Action Buttons */}
                        <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          <span
                            className={`rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider ${
                              isStaffOrTeacher
                                ? "bg-slate-100 text-slate-700"
                                : assignment.submissionStatus === "graded"
                                ? "bg-emerald-100 text-emerald-700"
                                : assignment.submissionStatus === "turned_in"
                                ? "bg-blue-100 text-blue-700"
                                : assignment.submissionStatus === "late"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isStaffOrTeacher
                              ? `${assignment.maxScore} Poin`
                              : assignment.submissionStatus === "graded"
                              ? `Nilai: ${assignment.score}`
                              : assignment.submissionStatus === "turned_in"
                              ? "Diserahkan"
                              : assignment.submissionStatus === "late"
                              ? "Terlambat"
                              : "Belum dikerjakan"}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteItemTarget({
                                  type: "assignment",
                                  id: assignment._id,
                                  title: assignment.title,
                                });
                              }}
                              title={`Hapus Tugas ${assignment.title}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>Hapus</span>
                            </button>
                          )}
                          <Link
                            href={targetUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                          >
                            <span>Detail</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Materials Section */}
          {course.materials && course.materials.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                Materi Pembelajaran
              </h3>
              <div className="grid gap-3">
                {course.materials.map((mat) => (
                  <div
                    key={mat._id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                          <BookOpen className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900">{mat.title}</h4>
                          {mat.description && (
                            <p className="text-xs text-slate-600 mt-1">{mat.description}</p>
                          )}
                          {mat.attachments && mat.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {mat.attachments.map((att, attIdx) => (
                                <a
                                  key={attIdx}
                                  href={`/api/files/download?url=${encodeURIComponent(att.url)}`}
                                  download={att.name}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                                >
                                  <Download className="size-3" />
                                  {att.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteItemTarget({
                              type: "material",
                              id: mat._id,
                              title: mat.title,
                            })
                          }
                          title={`Hapus Materi ${mat.title}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600 transition shrink-0 cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Diskusi & Komentar Kelas Section (TASK 6: Active for Admin, Guru, Siswa; Read-Only for Kurikulum & Kepsek) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="size-5 text-[#0066FF]" />
              <span>Diskusi &amp; Komentar Kelas</span>
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              {allComments.length} Komentar
            </span>
          </div>

          {!isReadOnly ? (
            <form onSubmit={handleAddClassComment} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tulis komentar atau pengumuman di diskusi kelas ini..."
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  disabled={submittingComment}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || submittingComment}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {submittingComment ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>Kirim</span>
                </button>
              </div>
              {commentError && (
                <p className="text-[11px] font-semibold text-rose-600">{commentError}</p>
              )}
            </form>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
              Mode Pratinjau Staf (Baca-Saja): Penulisan, pembalasan, dan penghapusan komentar
              dinonaktifkan.
            </div>
          )}

          {topLevelComments.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada diskusi atau komentar di kelas mapel ini.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {topLevelComments.map((c, idx) => {
                const cId = String(c._id || idx);
                const replies = repliesByParentId.get(cId) || [];
                const isReplyingHere = replyingTo?.parentId === cId;

                return (
                  <div
                    key={cId}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {c.userName || "Pengguna"}
                          </span>
                          {c.userRole && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                              {c.userRole}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            c.isDeleted ? "italic text-slate-400" : "text-slate-700"
                          }`}
                        >
                          {c.message}
                        </p>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!c.isDeleted && c._id && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({
                                  id: String(c._id),
                                  parentId: cId,
                                  postId: c.postId,
                                  authorName: c.userName || "Pengguna",
                                });
                                setReplyError(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            >
                              <Reply className="size-3" />
                              <span>Balas</span>
                            </button>
                          )}
                          {canDeleteComment(c) && c._id && (
                            <button
                              type="button"
                              disabled={deletingCommentId === String(c._id)}
                              onClick={() => handleDeleteComment(String(c._id))}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus komentar"
                            >
                              <Trash2 className="size-3" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-4 border-l-2 border-slate-200 pl-3 space-y-2">
                        {replies.map((rep, rIdx) => (
                          <div
                            key={String(rep._id || rIdx)}
                            className="flex items-start justify-between gap-2 rounded-lg bg-white p-2.5 border border-slate-100"
                          >
                            <div className="flex items-start gap-2">
                              <CornerDownRight className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {rep.userName || "Pengguna"}
                                  </span>
                                  {rep.userRole && (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                                      {rep.userRole}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-700">{rep.message}</p>
                              </div>
                            </div>

                            {!isReadOnly && canDeleteComment(rep) && rep._id && (
                              <button
                                type="button"
                                disabled={deletingCommentId === String(rep._id)}
                                onClick={() => handleDeleteComment(String(rep._id))}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                                title="Hapus balasan"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {!isReadOnly && isReplyingHere && (
                      <form onSubmit={handleSendReply} className="ml-4 pt-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Balas komentar ${replyingTo.authorName}...`}
                            value={replyText}
                            onChange={(e) => {
                              setReplyText(e.target.value);
                              if (replyError) setReplyError(null);
                            }}
                            disabled={submittingReply}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!replyText.trim() || submittingReply}
                            className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                          >
                            Balas
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                              setReplyError(null);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                        {replyError && (
                          <p className="text-[11px] font-semibold text-rose-600">{replyError}</p>
                        )}
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* KELENGKAPAN ENROLLMENT SISWA ROMBEL Section */}
      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="size-5 text-blue-600" />
              Status Enrollment Siswa Rombel{" "}
              {course.rombel?.name || course.enrollmentMonitoring?.rombelName || ""}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan siswa aktif di Rombel dengan siswa yang terdaftar pada Kelas Mapel{" "}
              <strong>{course.name}</strong>
            </p>
          </div>
          {course.enrollmentMonitoring ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                Enrolled: {course.enrollmentMonitoring.enrolledCount} /{" "}
                {course.enrollmentMonitoring.totalActiveRombelStudents}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  course.enrollmentMonitoring.missingCount > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                Missing: {course.enrollmentMonitoring.missingCount}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${
                  course.enrollmentMonitoring.enrollmentStatus === "Complete"
                    ? "bg-emerald-100 text-emerald-800"
                    : course.enrollmentMonitoring.enrollmentStatus === "No active students"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {course.enrollmentMonitoring.enrollmentStatus === "Complete" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-600" />
                )}
                Status: {course.enrollmentMonitoring.enrollmentStatus} (
                {course.enrollmentMonitoring.completionPercentage}%)
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {students.length} Siswa
            </span>
          )}
        </div>

        {course.enrollmentMonitoring ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Students Enrolled */}
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xs flex flex-col">
              <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-emerald-700" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                    Students Enrolled (Sudah Terdaftar)
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-black text-emerald-900">
                  {course.enrollmentMonitoring.enrolledStudents.length} Siswa
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {course.enrollmentMonitoring.enrolledStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Belum ada siswa aktif rombel ini yang terdaftar di Kelas Mapel ini.
                  </div>
                ) : (
                  course.enrollmentMonitoring.enrolledStudents.map((st, idx) => (
                    <div
                      key={st._id || idx}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-700">
                          {st.name ? st.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{st.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {st.nis && st.nis !== "-"
                              ? `NIS: ${st.nis}`
                              : st.nisn && st.nisn !== "-"
                              ? `NISN: ${st.nisn}`
                              : st.email}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {st.rombelName || course.rombel?.name || "-"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Students Not Yet Enrolled (Missing) */}
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xs flex flex-col">
              <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="size-4 text-amber-700" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                    Students Not Yet Enrolled (Belum Terdaftar)
                  </h3>
                </div>
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-black text-amber-900">
                  {course.enrollmentMonitoring.missingStudents.length} Siswa
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {course.enrollmentMonitoring.missingStudents.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-500 mb-2" />
                    <p className="text-xs font-bold text-emerald-800">
                      Seluruh siswa aktif pada rombel ini sudah terdaftar di Kelas Mapel ini.
                    </p>
                  </div>
                ) : (
                  course.enrollmentMonitoring.missingStudents.map((st, idx) => (
                    <div
                      key={st._id || idx}
                      className="flex items-center justify-between p-3.5 hover:bg-amber-50/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-800">
                          {st.name ? st.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{st.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {st.nis && st.nis !== "-"
                              ? `NIS: ${st.nis}`
                              : st.nisn && st.nisn !== "-"
                              ? `NISN: ${st.nisn}`
                              : st.email}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {st.rombelName || course.rombel?.name || "-"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
            Belum ada siswa terdaftar di kelas mapel ini.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {students.map((st, idx) => (
                <div
                  key={st._id || idx}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700">
                      {st.name ? st.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{st.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {st.nisn !== "-" ? `NISN: ${st.nisn}` : st.email}
                      </p>
                    </div>
                  </div>
                  {st.gender && st.gender !== "-" && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-slate-600">
                      {st.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Bottom Section: File yang dibagi */}
      {course.sharedFiles && course.sharedFiles.length > 0 && (
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900">
              File yang dibagi
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {course.sharedFiles.length} Berkas
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {course.sharedFiles.map((file, idx) => {
              const icon = file.type?.includes("pdf") ? (
                <FileArchive className="size-6 text-rose-500" />
              ) : file.type?.includes("doc") ? (
                <FileText className="size-6 text-blue-500" />
              ) : (
                <PlaySquare className="size-6 text-purple-500" />
              );

              const downloadUrl = `/api/files/download?url=${encodeURIComponent(file.url)}`;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3.5 rounded-xl border border-[#e4e6ef] bg-white p-4 shadow-xs hover:border-[#674ce7] transition group"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-slate-100 shrink-0 group-hover:bg-purple-50 transition">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-extrabold text-slate-900 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {file.size || "1.0 MB"}
                    </p>
                  </div>
                  <a
                    href={downloadUrl}
                    download={file.name}
                    className="p-1.5 text-slate-400 hover:text-[#0066FF] transition rounded-lg hover:bg-slate-100"
                    title="Download berkas"
                  >
                    <Download className="size-4" />
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Admin Delete Mapel Class Confirmation Modal */}
      {deleteClassModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hapus Kelas Mapel {course.name}?
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Seluruh Materi, Tugas, Kuis, pengumpulan nilai siswa pada kelas mapel ini,
                  serta diskusi kelas akan dihapus permanen. Rombel dan akun siswa tidak akan
                  terhapus.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingClass}
                onClick={() => setDeleteClassModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingClass}
                onClick={handleConfirmDeleteMapelClass}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deletingClass ? "Menghapus..." : "Hapus Kelas Mapel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Assignment / Quiz / Material Confirmation Modal */}
      {deleteItemTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hapus{" "}
                  {deleteItemTarget.type === "quiz"
                    ? "Kuis"
                    : deleteItemTarget.type === "assignment"
                    ? "Tugas"
                    : "Materi"}
                  ?
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus{" "}
                  <strong className="text-slate-900">{deleteItemTarget.title}</strong> dari
                  kelas mapel ini?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingItem}
                onClick={() => setDeleteItemTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingItem}
                onClick={handleConfirmDeleteItem}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deletingItem ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
