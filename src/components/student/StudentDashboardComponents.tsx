"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CirclePlus,
  Download,
  FileArchive,
  FileText,
  Filter,
  PlaySquare,
  UserRound,
  X,
  KeyRound,
  Hash,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export type SubjectCardData = {
  _id?: string;
  title: string;
  teacher: string;
  category: string;
  progress?: number;
  tone?: "purple" | "green" | "orange" | "blue" | "gold";
  bannerColor?: string;
  avatars?: number;
  classNameSubtitle?: string;
  assignmentCount?: number;
  quizCount?: number;
  customHref?: string;
  actionLabel?: string;
};

const toneMap: Record<string, string> = {
  purple: "from-[#20103f] to-[#6d4ee9]",
  green: "from-[#bbf7d0] via-[#d7f9e3] to-[#8fd8c8]",
  orange: "from-[#ecfeff] via-[#dbeafe] to-[#f7b267]",
  blue: "from-[#dbeafe] via-[#e0e7ff] to-[#94a3b8]",
  gold: "from-[#533317] via-[#a16207] to-[#d6b47f]",
};

export function SmoothProgress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#e9e2f8]">
      <div
        className="h-full rounded-full bg-[#674ce7] transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export function FooterBar() {
  // Footer is provided globally by RoleShell layout to prevent duplicate footers
  return null;
}

export interface StudentBannerInfo {
  name: string;
  email?: string;
  nis?: string | null;
  nisn?: string | null;
  photoUrl?: string | null;
  grade?: string | null;
  rombelName?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  academicYear?: string | null;
}

export function JoinClassBanner({ student }: { student?: StudentBannerInfo | null }) {
  const [modalOpen, setModalOpen] = useState(false);
  const initial = student?.name ? student.name.charAt(0).toUpperCase() : "S";

  return (
    <>
      <section className="relative min-h-[210px] overflow-hidden rounded-xl bg-[var(--primary)] px-7 py-8 text-white shadow-sm flex flex-col justify-between">
        <div className="absolute right-[-34px] top-[-34px] size-40 rounded-full bg-white/10 pointer-events-none" />
        {student ? (
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="size-16 rounded-2xl border-2 border-white/30 bg-white/15 overflow-hidden flex items-center justify-center text-2xl font-extrabold text-white shrink-0 shadow-xs">
              {student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="size-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {student.rombelName && (
                  <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                    {student.rombelName}
                  </span>
                )}
                {student.departmentCode && (
                  <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-blue-100">
                    {student.departmentCode}
                  </span>
                )}
                {student.nisn && (
                  <span className="text-[11px] font-mono text-blue-100">
                    NISN: {student.nisn}
                  </span>
                )}
              </div>
              <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] truncate">
                {student.name}
              </h1>
              <p className="mt-0.5 text-xs text-blue-100 truncate">
                {student.departmentName || student.email || "Portal Akademik Siswa"}
                {student.academicYear ? ` • TA ${student.academicYear}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.03em]">
            Join Kelas Mapel
          </h1>
        )}

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-xs font-extrabold text-[var(--primary)] transition duration-300 hover:-translate-y-0.5 cursor-pointer shadow-xs"
          >
            <CirclePlus className="size-4" />
            Join Kelas Baru
          </button>
          <Link
            href="/siswa/profile"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            <UserRound className="size-3.5" />
            Profil Saya
          </Link>
        </div>
      </section>

      <JoinClassModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function AverageScoreCard({
  average = 0,
  totalGraded = 0,
}: {
  average?: number;
  totalGraded?: number;
}) {
  const hasGrades = totalGraded > 0;
  const displayScore = Math.round(average * 10) / 10;
  return (
    <section className="rounded-xl border border-[#e4e6ef] bg-white p-7 shadow-sm flex flex-col justify-between">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-800">
          Nilai rata-rata
        </h2>
        {hasGrades ? (
          <>
            <div className="mt-6 flex items-end gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none text-slate-900">
                {displayScore}
              </span>
              <span className="mb-1 text-lg font-extrabold text-[var(--primary)]">
                / 100
              </span>
            </div>
            <div className="mt-6 h-2 rounded-full bg-[#e7ebf5]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-700"
                style={{ width: `${Math.min(Math.max(displayScore, 0), 100)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm font-extrabold text-slate-700">Belum ada nilai</p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Nilai rata-rata akan dihitung otomatis setelah tugas atau kuis Anda dinilai.
            </p>
          </div>
        )}
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {hasGrades ? `Berdasarkan ${totalGraded} penilaian` : "Belum ada tugas dinilai"}
      </p>
    </section>
  );
}

export function DashboardSubjectCard({
  id,
  title,
  subtitle,
  urgent,
  completed,
  totalTasks,
  completedTasks,
}: {
  id?: string;
  title: string;
  subtitle: string;
  urgent?: string;
  completed?: boolean;
  totalTasks?: number;
  completedTasks?: number;
}) {
  return (
    <article
      className={`rounded-xl border border-[#e4e6ef] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] ${
        completed
          ? "border-t-8 border-t-[#00796f]"
          : "border-t-8 border-t-[var(--primary)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold truncate text-slate-900">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 truncate">{subtitle}</p>
        </div>
        <span
          className={`grid size-7 place-items-center rounded-md shrink-0 ${
            completed
              ? "bg-[#e3f6f2] text-[#00796f]"
              : "bg-[#e5f1ff] text-[var(--primary)]"
          }`}
        >
          <BookOpen className="size-4" />
        </span>
      </div>
      {typeof totalTasks === "number" && (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Progres: <strong className="text-slate-800">{completedTasks ?? 0}</strong> / {totalTasks} aktivitas selesai
        </p>
      )}
      <p
        className={`mt-4 text-[11px] font-extrabold uppercase truncate ${
          completed ? "text-[#00796f]" : "text-red-600"
        }`}
      >
        {completed ? "Semua tugas & kuis selesai" : urgent || "Belum ada tugas"}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Link
          href={id ? `/siswa/courses/${id}` : "/siswa/courses"}
          className={`h-11 flex-1 rounded-md text-sm font-extrabold text-white text-center flex items-center justify-center transition duration-300 hover:-translate-y-0.5 ${
            completed ? "bg-[#00796f]" : "bg-[var(--primary)]"
          }`}
        >
          LIHAT KELAS
        </Link>
      </div>
    </article>
  );
}

export function TaskList({
  tasks,
}: {
  tasks?: Array<{
    _id: string;
    title: string;
    className: string;
    status: string;
    isUrgent?: boolean;
    dueDate?: string | null;
    score?: number | null;
    maxScore?: number;
    feedback?: string | null;
    href?: string;
  }>;
}) {
  const displayTasks = tasks || [];
  const urgentCount = displayTasks.filter(
    (t) => t.isUrgent || t.status === "late"
  ).length;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-slate-900">
          Tugas
        </h2>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="rounded bg-red-100 px-3 py-1 text-[10px] font-extrabold uppercase text-red-600">
              {urgentCount} perlu perhatian
            </span>
          )}
          <Link
            href="/siswa/assignments"
            className="text-xs font-extrabold text-[var(--primary)] hover:underline"
          >
            View All &gt;
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white">
        {displayTasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada tugas untuk kelas Anda.
          </div>
        ) : (
          displayTasks.map((task) => {
            const tone =
              task.status === "graded"
                ? "green"
                : task.status === "turned_in"
                  ? "blue"
                  : task.status === "late" || task.isUrgent
                    ? "red"
                    : "orange";

            const statusText =
              task.status === "graded"
                ? "Dinilai"
                : task.status === "turned_in"
                  ? "Diserahkan"
                  : task.status === "late"
                    ? "Terlambat"
                    : "Belum Selesai";

            const dueStr = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Tanpa tenggat";

            const targetHref = task.href || `/siswa/assignments/${task._id}`;

            return (
              <Link
                key={task._id}
                href={targetHref}
                className="flex items-start gap-3.5 border-b border-[#e4e6ef] p-4 last:border-0 hover:bg-slate-50 transition"
              >
                <span
                  className={`grid size-10 place-items-center rounded-full shrink-0 mt-0.5 ${
                    tone === "green"
                      ? "bg-emerald-100 text-emerald-700"
                      : tone === "blue"
                        ? "bg-[#e5f1ff] text-[var(--primary)]"
                        : tone === "orange"
                          ? "bg-orange-100 text-orange-500"
                          : "bg-red-100 text-red-500"
                  }`}
                >
                  <BookOpen className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800">
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {task.className} &bull; Tenggat: {dueStr}
                  </p>
                  {task.status === "graded" && task.score !== null && task.score !== undefined && (
                    <p className="mt-1 text-xs font-extrabold text-emerald-700">
                      Nilai: {task.score} / {task.maxScore || 100}
                    </p>
                  )}
                  {task.feedback && (
                    <p className="mt-0.5 text-[11px] italic text-slate-500 line-clamp-1">
                      Catatan Guru: &ldquo;{task.feedback}&rdquo;
                    </p>
                  )}
                </div>
                <span
                  className={`rounded px-2.5 py-1 text-[10px] font-extrabold uppercase shrink-0 ${
                    tone === "green"
                      ? "bg-emerald-100 text-emerald-700"
                      : tone === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : tone === "orange"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-red-100 text-red-600"
                  }`}
                >
                  {statusText}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

export function SharedFileCard({
  file,
  type = "pdf",
}: {
  file?: {
    name: string;
    url: string;
    type?: string;
    size?: string;
    className?: string;
  };
  type?: "pdf" | "docx" | "pptx";
}) {
  const detectedType = file?.type?.includes("pdf")
    ? "pdf"
    : file?.type?.includes("doc")
    ? "docx"
    : type;

  const Icon =
    detectedType === "pdf"
      ? FileArchive
      : detectedType === "docx"
      ? FileText
      : PlaySquare;

  const downloadUrl = file?.url
    ? `/api/files/download?url=${encodeURIComponent(file.url)}`
    : "#";

  return (
    <article className="flex items-center gap-4 rounded-xl border border-[#e4e6ef] bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]">
      <span className="grid size-12 place-items-center rounded-md bg-slate-100 text-slate-500 shrink-0">
        <Icon className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-800" title={file?.name}>
          {file?.name || "Materi Pelajaran"}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {file?.size || "1.0 MB"} • {file?.className || "Materi"}
        </p>
      </div>
      <a
        href={downloadUrl}
        download={file?.name || true}
        className="text-slate-400 hover:text-[var(--primary)] transition p-1"
        title="Download file"
      >
        <Download className="size-5" />
      </a>
    </article>
  );
}

export function FilterControls({
  semester,
  onSemesterChange,
  subject,
  onSubjectChange,
  subjects = [],
}: {
  semester?: string;
  onSemesterChange?: (sem: string) => void;
  subject?: string;
  onSubjectChange?: (sub: string) => void;
  subjects?: string[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1">
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Semester</span>
        <select
          value={semester || "Semua"}
          onChange={(e) => onSemesterChange?.(e.target.value)}
          className="h-10 rounded-md border border-[#d9deeb] bg-white px-3 text-xs outline-none transition focus:border-[#674ce7] focus:ring-2 focus:ring-[#eee9ff]"
        >
          <option value="Semua">Semua</option>
          <option value="Genap">Genap</option>
          <option value="Ganjil">Ganjil</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Mata Pelajaran</span>
        <select
          value={subject || "Semua"}
          onChange={(e) => onSubjectChange?.(e.target.value)}
          className="h-10 rounded-md border border-[#d9deeb] bg-white px-3 text-xs outline-none transition focus:border-[#674ce7] focus:ring-2 focus:ring-[#eee9ff]"
        >
          <option value="Semua">Semua Mapel</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <button className="grid size-10 place-items-center rounded-md border border-[#d9deeb] bg-white text-slate-600 transition hover:border-[#674ce7] hover:text-[#674ce7]">
        <Filter className="size-4" />
      </button>
    </div>
  );
}

export function SubjectCourseCard({
  course,
  customHref,
  actionLabel,
  onSelect,
}: {
  course: SubjectCardData;
  customHref?: string;
  actionLabel?: string;
  onSelect?: () => void;
}) {
  const toneKey = (course.tone || course.bannerColor || "blue") as string;
  const gradient = toneMap[toneKey] || toneMap.blue;

  return (
    <article className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] flex flex-col justify-between">
      <div>
        <div className={`relative h-32 bg-gradient-to-br ${gradient}`}>
          <span className="absolute left-4 top-4 rounded bg-[#674ce7] px-2 py-1 text-[9px] font-extrabold uppercase text-white shadow-xs">
            {course.category}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">{course.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <UserRound className="size-3.5" />
            {course.teacher}
          </p>
          {course.classNameSubtitle && (
            <p className="mt-1 text-xs text-slate-400 font-medium">
              {course.classNameSubtitle}
            </p>
          )}

          {course.progress !== undefined ? (
            <>
              <div className="mt-7 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                <span>Progress Tugas</span>
                <span className="text-[#674ce7]">{course.progress}%</span>
              </div>
              <div className="mt-2">
                <SmoothProgress value={course.progress} />
              </div>
            </>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-xs font-bold">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                {course.assignmentCount ?? 0} Tugas
              </span>
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                {course.quizCount ?? 0} Kuis
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="p-5 pt-0">
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eee9ff] px-2.5 py-1 text-[10px] font-bold text-[#674ce7]">
            <UserRound className="size-3" />
            <span>{course.avatars ?? 0} Siswa</span>
          </span>
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              className="rounded-md border border-[#ded4ff] bg-[#fbf8ff] px-5 py-2 text-xs font-semibold text-[#674ce7] transition duration-300 hover:-translate-y-0.5 hover:bg-[#eee9ff] cursor-pointer"
            >
              {actionLabel || course.actionLabel || "Buka Mapel"}
            </button>
          ) : (
            <Link
              href={customHref || course.customHref || (course._id ? `/siswa/courses/${course._id}` : "#")}
              className="rounded-md border border-[#ded4ff] bg-[#fbf8ff] px-5 py-2 text-xs font-semibold text-[#674ce7] transition duration-300 hover:-translate-y-0.5 hover:bg-[#eee9ff]"
            >
              {actionLabel || course.actionLabel || "Enter Class"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function JoinNewCourseCard() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <article
        onClick={() => setModalOpen(true)}
        className="grid min-h-[344px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-[#d9cfee] bg-[#fffbff] p-8 text-center transition hover:border-[#674ce7] hover:bg-[#fbf9ff] group"
      >
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#eee9ff] text-slate-600 transition group-hover:scale-105">
            <CirclePlus className="size-8 text-[#674ce7]" />
          </span>
          <h3 className="mt-8 font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900">
            Masuk ke Kelas Baru
          </h3>
          <p className="mt-3 max-w-48 text-sm leading-5 text-slate-500">
            Masukkan kode dan password kelas untuk bergabung.
          </p>
        </div>
      </article>

      <JoinClassModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function JoinClassModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !password.trim()) {
      setError("Kode kelas dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/siswa/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal bergabung ke kelas.");
      }

      setSuccess(data.message || "Berhasil bergabung ke kelas!");
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF]">
            <CirclePlus className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gabung Kelas Mapel</h2>
            <p className="text-xs text-slate-500">Masukkan kode dan password kelas dari Guru</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-600 border border-rose-100">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Kode Kelas</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: 29QRV"
                required
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold tracking-wider uppercase text-slate-800 placeholder:text-slate-400 placeholder:normal-case focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Password Kelas</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password yang diberikan guru"
                required
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0052cc] transition disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Menghubungkan..." : "Gabung Kelas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

