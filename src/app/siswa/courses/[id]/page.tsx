"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

interface AssignmentItem {
  _id: string;
  title: string;
  type: "tugas" | "kuis";
  dueDate?: string;
  maxScore: number;
  submissionStatus: "assigned" | "turned_in" | "late" | "graded";
  score?: number | null;
  submittedAt?: string | null;
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
  comments?: Array<{
    userId: string;
    userName: string;
    message: string;
    createdAt: string;
  }>;
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
    name: string;
    grade?: string;
  };
  studentCount: number;
  assignments: AssignmentItem[];
  posts: PostItem[];
  materials: Array<{
    _id: string;
    title: string;
    description?: string;
    attachments?: FileItem[];
  }>;
  sharedFiles: FileItem[];
}

export default function SiswaCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  const [course, setCourse] = useState<ClassDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchClassDetail = async () => {
    try {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);
      const res = await fetch(`/api/siswa/courses/${classId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorStatus(res.status);
        throw new Error(json.message || "Gagal memuat detail kelas");
      }
      setCourse(json.data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetail();
  }, [classId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#0066FF]" />
        <p className="text-sm font-semibold text-slate-500">Memuat detail kelas...</p>
      </div>
    );
  }

  // 403 Forbidden: Student is not enrolled in this class
  if (errorStatus === 403) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center mt-12 animate-in fade-in">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Akses Ditolak</h2>
        <p className="mt-2 text-sm text-slate-600">
          {errorMessage || "Anda belum terdaftar sebagai anggota di kelas ini."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/siswa/courses"
            className="rounded-xl bg-[#0066FF] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0052cc] transition"
          >
            Kembali ke Mata Pelajaran
          </Link>
        </div>
      </div>
    );
  }

  // 404 or other errors
  if (errorStatus === 404 || !course) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center mt-12 animate-in fade-in">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Kelas Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-slate-600">
          {errorMessage || "Kelas yang Anda tuju tidak tersedia atau telah diarsipkan."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/siswa/courses"
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-700 transition"
          >
            Kembali ke Mata Pelajaran
          </Link>
          <button
            onClick={fetchClassDetail}
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

  return (
    <div className="animate-fade-up space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/siswa/courses" className="hover:text-[#0066FF] flex items-center gap-1">
          <ChevronLeft className="size-4" />
          Mata Pelajaran
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">{course.name}</span>
      </div>

      {/* Hero Banner Header matching Figma PWPB banner */}
      <div className="relative min-h-[160px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#20103f] via-[#4d32a8] to-[#6d4ee9] p-8 text-white shadow-sm flex flex-col justify-end">
        <div className="absolute right-[-40px] top-[-40px] size-48 rounded-full bg-white/10 blur-2xl" />
        <span className="inline-block w-fit rounded bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white mb-2">
          {course.subject?.category || "Kejuruan"}
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.02em]">
          {course.name}
        </h1>
        <p className="mt-1 text-sm font-medium text-purple-100 flex items-center gap-2">
          <GraduationCap className="size-4" />
          {teacherName}
        </p>
      </div>

      {/* 2-Column Layout matching Figma: Left Upcoming Tasks, Right Class Stream */}
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        {/* Left Column: Tugas Mendatang */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900">
              Tugas Mendatang
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {course.assignments.length} Tugas
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e4e6ef] bg-white shadow-xs divide-y divide-slate-100">
            {course.assignments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Belum ada tugas mendatang.
              </div>
            ) : (
              course.assignments.map((assignment) => {
                const dueText = assignment.dueDate
                  ? new Date(assignment.dueDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Tanpa batas waktu";

                const isCompleted =
                  assignment.submissionStatus === "graded" ||
                  assignment.submissionStatus === "turned_in";

                return (
                  <div key={assignment._id} className="p-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 leading-snug truncate">
                          {assignment.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Calendar className="size-3 shrink-0 text-slate-400" />
                          <span>{dueText}</span>
                        </p>
                      </div>
                      <span
                        className={`rounded px-2.5 py-0.5 text-[9px] font-extrabold uppercase shrink-0 ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : assignment.submissionStatus === "late"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {assignment.submissionStatus === "graded"
                          ? `Nilai: ${assignment.score}`
                          : assignment.submissionStatus === "turned_in"
                          ? "Diserahkan"
                          : assignment.submissionStatus === "late"
                          ? "Terlambat"
                          : "Tugas"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Class Stream / Feed Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900">
              Aktivitas Kelas
            </h2>
          </div>

          <div className="space-y-4">
            {course.posts.length === 0 ? (
              <div className="rounded-2xl border border-[#e4e6ef] bg-white p-12 text-center shadow-xs">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-blue-50 text-[var(--primary)] mb-3">
                  <MessageSquare className="size-6" />
                </span>
                <p className="text-sm font-bold text-slate-700">Belum ada aktivitas di kelas ini.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Guru pengampu belum memposting tugas atau pengumuman baru.
                </p>
              </div>
            ) : (
              course.posts.map((post) => {
                const postDate = new Date(post.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <article
                    key={post._id}
                    className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs transition hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF] shrink-0">
                        <BookOpen className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{postDate}</p>

                        {post.content && (
                          <p className="mt-3 text-xs leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {post.content}
                          </p>
                        )}

                        <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
                          <span className="flex items-center gap-1.5 hover:text-[#0066FF] cursor-pointer">
                            <MessageSquare className="size-4" />
                            {post.comments?.length || 0} Komentar Kelas
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Bottom Section: File yang dibagi */}
      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
            File yang dibagi
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {course.sharedFiles.length} Berkas
          </span>
        </div>

        {course.sharedFiles.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e6ef] bg-white p-8 text-center shadow-xs">
            <p className="text-sm font-semibold text-slate-600">Belum ada file yang dibagikan.</p>
          </div>
        ) : (
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
                    <p className="text-xs font-extrabold text-slate-900 truncate" title={file.name}>
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
        )}
      </section>

      <FooterBar />
    </div>
  );
}
