"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  BookOpen,
  GraduationCap,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  X,
} from "lucide-react";
import { SharedClassDetail } from "@/components/class/SharedClassDetail";

interface TeacherInfo {
  _id?: string;
  name: string;
  email?: string;
  nip?: string;
  degree?: string;
}

interface EnrollmentStudentItem {
  _id: string;
  name: string;
  nis?: string;
  nisn?: string;
  email?: string;
  rombelName: string;
}

interface CourseClassItem {
  _id: string;
  name: string;
  code: string;
  enrollmentMethod?: "rombel" | "invitation";
  teacherId?: TeacherInfo;
  teacherName?: string;
  rombelId?: string;
  rombelName?: string;
  category?: string;
  assignmentCount?: number;
  quizCount?: number;
  studentCount?: number;
  bannerColor?: string;
  totalActiveRombelStudents?: number;
  enrolledCount?: number;
  missingCount?: number;
  completionPercentage?: number;
  enrollmentStatus?: "Complete" | "Incomplete" | "No active students" | "Unassigned";
  enrolledStudents?: EnrollmentStudentItem[];
  missingStudents?: EnrollmentStudentItem[];
}

interface LegacyCourseClassItem {
  _id: string;
  name: string;
  code: string;
  teacherName: string;
  category: string;
  studentCount: number;
  academicYear: string;
}

interface RombelData {
  _id: string;
  name: string;
  grade: string;
  academicYear: string;
  departmentId?: {
    _id?: string;
    name: string;
    code: string;
  };
  homeroomTeacherId?: TeacherInfo;
  studentIds?: unknown[];
  activeStudentCount?: number;
  maxCapacity?: number;
  courseClasses?: CourseClassItem[];
  legacyCourseClasses?: LegacyCourseClassItem[];
}

interface SharedRombelPreviewProps {
  rombelId: string;
  role: "admin" | "kepsek" | "kurikulum";
  backHref: string;
  backLabel: string;
}

export function SharedRombelPreview({
  rombelId,
  role,
  backHref,
  backLabel,
}: SharedRombelPreviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [rombel, setRombel] = useState<RombelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal to inspect Enrolled vs Missing Students directly from Rombel overview
  const [inspectingCourse, setInspectingCourse] = useState<CourseClassItem | null>(null);

  // Legacy Mapel Class one-time rombel assignment state (Task 3)
  const [assigningLegacyId, setAssigningLegacyId] = useState<string | null>(null);

  const baseClassHref =
    role === "admin"
      ? `/admin/classes/${rombelId}`
      : role === "kepsek"
      ? `/kepsek/classes/${rombelId}`
      : `/kurikulum/classes/${rombelId}`;

  const fetchRombelData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/classes/${rombelId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat pratinjau kelas");
      }
      setRombel(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRombelData();
  }, [rombelId]);

  async function handleAssignLegacyToCurrentRombel(legacyCourse: LegacyCourseClassItem) {
    if (!rombel) return;
    const confirmed = window.confirm(
      `Tetapkan Kelas Mapel "${legacyCourse.name}" ke Rombel ${rombel.name}?\n\nPenting: Penetapan rombel ini bersifat satu kali (permanen) dan tidak dapat diubah kembali.`
    );
    if (!confirmed) return;

    try {
      setAssigningLegacyId(legacyCourse._id);
      const res = await fetch(`/api/guru/classes/${legacyCourse._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classRombelId: rombel._id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menetapkan rombel pada Kelas Mapel");
      } else {
        await fetchRombelData();
      }
    } catch {
      alert("Terjadi kesalahan saat menetapkan rombel");
    } finally {
      setAssigningLegacyId(null);
    }
  }

  // If a specific courseId is selected via query param, render the Kelas Mapel Detail experience
  if (courseId) {
    return (
      <SharedClassDetail
        classId={courseId}
        mode="readonly"
        role={role}
        backHref={baseClassHref}
        backLabel={rombel ? `Daftar Mapel ${rombel.name}` : "Daftar Mapel"}
        onCourseChange={(newCourseId) => {
          router.push(`${baseClassHref}?courseId=${newCourseId}`);
        }}
      />
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#0066FF]" />
        <p className="text-sm font-semibold text-slate-500">Memuat pratinjau kelas...</p>
      </div>
    );
  }

  // Error State
  if (error || !rombel) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center mt-12">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Gagal Memuat Kelas</h2>
        <p className="mt-2 text-xs text-slate-600">{error || "Kelas tidak ditemukan."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={backHref}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-700 transition"
          >
            Kembali ke {backLabel}
          </Link>
          <button
            type="button"
            onClick={fetchRombelData}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="size-4" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const homeroomTeacher = rombel.homeroomTeacherId
    ? `${rombel.homeroomTeacherId.name}${
        rombel.homeroomTeacherId.degree ? `, ${rombel.homeroomTeacherId.degree}` : ""
      }`
    : "Belum ditentukan";

  const courseClasses = rombel.courseClasses || [];
  const legacyCourseClasses = rombel.legacyCourseClasses || [];
  const activeStudentCount =
    typeof rombel.activeStudentCount === "number"
      ? rombel.activeStudentCount
      : Array.isArray(rombel.studentIds)
      ? rombel.studentIds.length
      : 0;

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href={backHref} className="hover:text-[#0066FF] flex items-center gap-1 transition">
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">Pratinjau Rombel: {rombel.name}</span>
      </div>

      {/* Staff Read-Only Notice Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-center shadow-xs">
        <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
          Monitoring Kelengkapan Enrollment & Aktivitas Rombel (Baca-Saja)
        </p>
        <p className="mt-0.5 text-xs text-blue-700">
          Pantau kelengkapan pendaftaran siswa aktif Rombel <strong>{rombel.name}</strong> pada setiap Kelas Mapel, identifikasi siswa yang belum bergabung, atau buka Kelas Mapel untuk melihat Tugas, Kuis, dan Diskusi.
        </p>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#2563eb] p-8 text-white shadow-sm">
        <div className="absolute right-[-40px] top-[-40px] size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
            Kelas {rombel.grade}
          </span>
          <span className="rounded bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
            {rombel.departmentId?.name || "Umum"}
          </span>
          <span className="rounded bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
            TA {rombel.academicYear}
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.02em]">
          Rombel: {rombel.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-blue-100">
          <div className="flex items-center gap-1.5 font-medium">
            <GraduationCap className="size-4 text-blue-200" />
            <span>Wali Kelas: <strong className="text-white">{homeroomTeacher}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="size-4 text-blue-200" />
            <span>Active students: <strong className="text-white">{activeStudentCount} Siswa Aktif</strong> (Kapasitas {rombel.maxCapacity || 36})</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <BookOpen className="size-4 text-blue-200" />
            <span>Kelas Mapel: <strong className="text-white">{courseClasses.length} Mapel</strong></span>
          </div>
        </div>
      </div>

      {/* Mapel Classes Section with Enrollment Completeness Monitoring (Task 2.2 - 2.5) */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="size-5 text-blue-600" />
              Kelas Mapel & Status Enrollment Siswa ({rombel.name})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan jumlah siswa aktif di rombel ({activeStudentCount} siswa) dengan siswa yang sudah terdaftar di masing-masing Kelas Mapel
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 self-start sm:self-auto">
            {courseClasses.length} Kelas Mapel
          </span>
        </div>

        {courseClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
            <FolderOpen className="mx-auto size-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              Belum Ada Kelas Mapel
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              Belum ada Kelas Mapel yang ditetapkan ke rombel {rombel.name}.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courseClasses.map((cc) => {
              const totalActive = cc.totalActiveRombelStudents ?? activeStudentCount;
              const enrolled = cc.enrolledCount ?? 0;
              const missing = cc.missingCount ?? Math.max(0, totalActive - enrolled);
              const pct =
                cc.completionPercentage ??
                (totalActive > 0 ? Math.round((enrolled / totalActive) * 100) : 0);
              const status =
                cc.enrollmentStatus ||
                (totalActive === 0
                  ? "No active students"
                  : missing === 0
                  ? "Complete"
                  : "Incomplete");

              const statusBadge =
                status === "Complete" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Complete ({pct}%)
                  </span>
                ) : status === "No active students" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                    <Users className="size-3.5 text-slate-500" />
                    No active students
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    Incomplete ({pct}%)
                  </span>
                );

              const teacherDisplayName =
                cc.teacherName || cc.teacherId?.name || "Guru Pengampu";

              return (
                <article
                  key={cc._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Top Accent Header */}
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 px-5 py-4 flex items-center justify-between gap-2">
                      <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                        {cc.category || "Kejuruan"}
                      </span>
                      {statusBadge}
                    </div>

                    {/* Main Details */}
                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900">
                          {cc.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          Assigned teacher:{" "}
                          <strong className="text-slate-900">{teacherDisplayName}</strong>
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Assigned rombel:{" "}
                          <strong className="text-slate-800">{cc.rombelName || rombel.name}</strong>
                        </p>
                      </div>

                      {/* Enrollment Completeness Metrics Box (Task 2.2 & 2.3) */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-white p-2 border border-slate-100">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Siswa Rombel
                            </p>
                            <p className="mt-0.5 text-sm font-black text-slate-800">
                              {totalActive}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-emerald-100">
                            <p className="text-[10px] font-bold uppercase text-emerald-700">
                              Enrolled
                            </p>
                            <p className="mt-0.5 text-sm font-black text-emerald-700">
                              {enrolled} / {totalActive}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg bg-white p-2 border ${
                              missing > 0 ? "border-amber-200" : "border-slate-100"
                            }`}
                          >
                            <p
                              className={`text-[10px] font-bold uppercase ${
                                missing > 0 ? "text-amber-700" : "text-slate-400"
                              }`}
                            >
                              Missing
                            </p>
                            <p
                              className={`mt-0.5 text-sm font-black ${
                                missing > 0 ? "text-amber-700" : "text-slate-700"
                              }`}
                            >
                              {missing}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500">Status: {status}</span>
                            <span
                              className={
                                status === "Complete"
                                  ? "text-emerald-700"
                                  : status === "No active students"
                                  ? "text-slate-500"
                                  : "text-amber-700"
                              }
                            >
                              {pct}% Terdaftar
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                status === "Complete"
                                  ? "bg-emerald-500"
                                  : status === "No active students"
                                  ? "bg-slate-400"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                          {cc.assignmentCount ?? 0} Tugas
                        </span>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                          {cc.quizCount ?? 0} Kuis
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectingCourse(cc)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Users className="size-3.5 text-blue-600" />
                      <span>Cek Siswa ({missing} Missing)</span>
                    </button>
                    <Link
                      href={`${baseClassHref}?courseId=${cc._id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                    >
                      <span>Buka Mapel</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* TASK 3: Legacy Mapel Classes Without an Assigned Rombel */}
      {role === "admin" && legacyCourseClasses.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                Kelas Mapel Tanpa Rombel (Legacy — Belum Ditetapkan)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Ditemukan {legacyCourseClasses.length} Kelas Mapel lama yang dibuat sebelum aturan wajib Rombel. Anda dapat menetapkan Kelas Mapel tersebut ke Rombel <strong>{rombel.name}</strong> satu kali secara permanen.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {legacyCourseClasses.map((lc) => (
              <div
                key={lc._id}
                className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {lc.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Guru: <strong>{lc.teacherName}</strong> &bull; {lc.studentCount} Siswa Terdaftar
                  </p>
                </div>
                <button
                  type="button"
                  disabled={assigningLegacyId === lc._id}
                  onClick={() => handleAssignLegacyToCurrentRombel(lc)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="size-3.5" />
                  <span>
                    {assigningLegacyId === lc._id
                      ? "Menetapkan..."
                      : `Tetapkan ke ${rombel.name}`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal: Missing & Enrolled Student Details (Task 2.4) */}
      {inspectingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Detail Kelengkapan Siswa — {inspectingCourse.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rombel: <strong>{rombel.name}</strong> &bull; Guru:{" "}
                  <strong>{inspectingCourse.teacherName || "Guru Pengampu"}</strong> &bull; Enrolled:{" "}
                  <strong>
                    {inspectingCourse.enrolledCount ?? 0} /{" "}
                    {inspectingCourse.totalActiveRombelStudents ?? activeStudentCount}
                  </strong>{" "}
                  &bull; Missing: <strong>{inspectingCourse.missingCount ?? 0}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCourse(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid gap-6 md:grid-cols-2">
              {/* List 1: Students Not Yet Enrolled (Missing) */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col overflow-hidden">
                <div className="border-b border-amber-200 bg-amber-100/70 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="size-4 text-amber-700" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                      Students Not Yet Enrolled (Belum Terdaftar)
                    </h4>
                  </div>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-900">
                    {(inspectingCourse.missingStudents || []).length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-amber-100 p-2">
                  {(inspectingCourse.missingStudents || []).length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="mx-auto size-8 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-emerald-800">
                        Lengkap! Seluruh siswa aktif Rombel {rombel.name} sudah terdaftar.
                      </p>
                    </div>
                  ) : (
                    (inspectingCourse.missingStudents || []).map((st) => (
                      <div
                        key={st._id}
                        className="flex items-center justify-between rounded-lg bg-white p-3 my-1 border border-amber-100"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{st.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {st.nis && st.nis !== "-"
                              ? `NIS: ${st.nis}`
                              : st.nisn && st.nisn !== "-"
                              ? `NISN: ${st.nisn}`
                              : st.email}
                          </p>
                        </div>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {st.rombelName || rombel.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* List 2: Students Enrolled */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 flex flex-col overflow-hidden">
                <div className="border-b border-emerald-200 bg-emerald-100/60 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-emerald-700" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                      Students Enrolled (Sudah Terdaftar)
                    </h4>
                  </div>
                  <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-xs font-black text-emerald-900">
                    {(inspectingCourse.enrolledStudents || []).length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-emerald-100 p-2">
                  {(inspectingCourse.enrolledStudents || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Belum ada siswa aktif Rombel {rombel.name} yang terdaftar di Kelas Mapel ini.
                    </div>
                  ) : (
                    (inspectingCourse.enrolledStudents || []).map((st) => (
                      <div
                        key={st._id}
                        className="flex items-center justify-between rounded-lg bg-white p-3 my-1 border border-emerald-100"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{st.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {st.nis && st.nis !== "-"
                              ? `NIS: ${st.nis}`
                              : st.nisn && st.nisn !== "-"
                              ? `NISN: ${st.nisn}`
                              : st.email}
                          </p>
                        </div>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {st.rombelName || rombel.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Mode monitoring baca-saja (tidak mengubah status pendaftaran siswa secara otomatis).
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`${baseClassHref}?courseId=${inspectingCourse._id}`}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  Buka Halaman Mapel
                </Link>
                <button
                  type="button"
                  onClick={() => setInspectingCourse(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
