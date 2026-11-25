"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Users,
  BookOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { SharedClassDetail } from "@/components/class/SharedClassDetail";

interface StudentSummary {
  _id: string;
  name: string;
  nis: string;
  nisn: string;
  email: string;
  gender: string;
}

interface EnrollmentStudentItem {
  _id: string;
  name: string;
  nis: string;
  nisn: string;
  email: string;
  rombelName: string;
}

interface CourseEnrollmentMonitoring {
  rombelId: string | null;
  rombelName: string;
  totalActiveRombelStudents: number;
  enrolledCount: number;
  missingCount: number;
  completionPercentage: number;
  enrollmentStatus: "Complete" | "Incomplete" | "No active students" | "Unassigned";
  enrolledStudents: EnrollmentStudentItem[];
  missingStudents: EnrollmentStudentItem[];
}

interface MapelCourseSummary {
  _id: string;
  name: string;
  code: string;
  enrollmentMethod?: "rombel" | "invitation";
  bannerColor: string;
  academicYear?: string;
  category?: string;
  teacherName?: string;
  missingCount?: number;
  assignedRombel?: {
    _id: string | null;
    name: string;
  };
  teacher?: {
    _id?: string;
    name: string;
    email?: string;
    degree?: string;
    nip?: string;
  } | null;
  teacherId?: {
    _id?: string;
    name: string;
    email?: string;
    degree?: string;
    nip?: string;
  } | null;
  subject?: {
    _id?: string;
    name: string;
    code?: string;
    category?: string;
  } | null;
  studentCount: number;
  enrollmentMonitoring?: CourseEnrollmentMonitoring;
  assignmentCount: number;
  quizCount: number;
  materialCount?: number;
  postCount?: number;
}

interface RombelPreviewData {
  _id: string;
  name: string;
  grade: string;
  academicYear: string;
  maxCapacity: number;
  department?: {
    _id?: string;
    name: string;
    code: string;
  } | null;
  departmentId?: {
    _id?: string;
    name: string;
    code: string;
  } | null;
  homeroomTeacher?: {
    _id?: string;
    name: string;
    email?: string;
    degree?: string;
    nip?: string;
  } | null;
  homeroomTeacherId?: {
    _id?: string;
    name: string;
    email?: string;
    degree?: string;
    nip?: string;
  } | null;
  studentCount?: number;
  activeStudentCount?: number;
  students?: StudentSummary[];
  activeRombelStudents?: StudentSummary[];
  studentIds?: StudentSummary[];
  courseClassCount?: number;
  courseClasses?: MapelCourseSummary[];
}

interface SharedRombelPreviewProps {
  rombelId: string;
  role: "admin" | "kurikulum" | "kepsek";
  backHref?: string;
  backLabel?: string;
}

export function SharedRombelPreview({
  rombelId,
  role,
  backHref,
  backLabel,
}: SharedRombelPreviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCourseId =
    searchParams.get("courseClassId") || searchParams.get("courseId");

  const [data, setData] = useState<RombelPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mapel" | "students">("mapel");

  // Delete Mapel Class state (TASK 4)
  const [deleteTargetMapel, setDeleteTargetMapel] = useState<MapelCourseSummary | null>(null);
  const [deletingMapel, setDeletingMapel] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const defaultBackHref =
    backHref ||
    (role === "admin"
      ? "/admin/classes"
      : role === "kurikulum"
      ? "/kurikulum/grades/classes"
      : "/kepsek/teachers");

  const defaultBackLabel =
    backLabel ||
    (role === "admin"
      ? "Manajemen Kelas"
      : role === "kurikulum"
      ? "Data Kelas"
      : "Monitor Guru");

  const fetchRombelPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/classes/${rombelId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat detail rombel");
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  }, [rombelId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRombelPreview();
  }, [fetchRombelPreview]);

  const handleOpenCourseClass = (courseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("courseClassId", courseId);
    router.push(`?${params.toString()}`);
  };

  const handleConfirmDeleteMapel = async () => {
    if (!deleteTargetMapel || deletingMapel) return;
    setDeletingMapel(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/guru/classes/${deleteTargetMapel._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus Kelas Mapel");
      }

      const deletedName = deleteTargetMapel.name;
      setDeleteTargetMapel(null);
      setSuccessBanner(
        `Kelas Mapel "${deletedName}" beserta seluruh konten dan aktivitas kelas terkait berhasil dihapus.`
      );
      await fetchRombelPreview();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus Kelas Mapel"
      );
    } finally {
      setDeletingMapel(false);
    }
  };

  // If a specific Mapel / CourseClass is selected in the query string, render SharedClassDetail
  if (selectedCourseId) {
    const clearCourseSelectionHref = `/${role}/classes/${rombelId}`;
    return (
      <SharedClassDetail
        classId={selectedCourseId}
        mode={role === "admin" ? "admin" : "readonly"}
        role={role}
        backHref={clearCourseSelectionHref}
        backLabel={data ? `Rombel ${data.name}` : "Detail Rombel"}
        onCourseChange={(newId) => handleOpenCourseClass(newId)}
        onCourseDeleted={() => {
          router.push(clearCourseSelectionHref);
          fetchRombelPreview();
        }}
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#0066FF]" />
        <p className="text-sm font-semibold text-slate-500">Memuat pratinjau rombel...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center mt-12 animate-in fade-in">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Rombel Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-slate-600">
          {error || "Rombel yang Anda tuju tidak tersedia atau belum aktif."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={defaultBackHref}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-700 transition"
          >
            Kembali ke {defaultBackLabel}
          </Link>
          <button
            onClick={fetchRombelPreview}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="size-4" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const homeroomObj = data.homeroomTeacher || data.homeroomTeacherId || null;
  const homeroomName = homeroomObj
    ? `${homeroomObj.name}${homeroomObj.degree ? `, ${homeroomObj.degree}` : ""}`
    : "Belum Ditentukan";
  const departmentObj = data.department || data.departmentId || null;
  const studentsList =
    data.students || data.activeRombelStudents || data.studentIds || [];
  const courseClassesList = data.courseClasses || [];
  const studentCount =
    data.studentCount ?? data.activeStudentCount ?? studentsList.length;
  const courseClassCount = data.courseClassCount ?? courseClassesList.length;

  const isReadOnlyRole = role === "kurikulum" || role === "kepsek";

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link
          href={defaultBackHref}
          className="hover:text-[#0066FF] flex items-center gap-1 transition"
        >
          <ChevronLeft className="size-4" />
          {defaultBackLabel}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">Pratinjau Rombel {data.name}</span>
      </div>

      {/* Staff Read-Only Notice Banner (ONLY for Kurikulum & Kepsek, NOT Admin) */}
      {isReadOnlyRole && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-center shadow-xs">
          <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Mode Pratinjau Staf (Baca-Saja)
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            Anda melihat daftar Kelas Mapel dan anggota siswa yang terhubung dengan Rombel{" "}
            <strong>{data.name}</strong>. Pilih salah satu Kelas Mapel untuk meninjau materi,
            tugas, ulangan harian, dan diskusi kelas dalam mode baca-saja.
          </p>
        </div>
      )}

      {successBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Rombel Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#2563eb] p-7 text-white shadow-sm">
        <div className="absolute right-[-40px] top-[-40px] size-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-md bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                Tingkat {data.grade}
              </span>
              {departmentObj && (
                <span className="rounded-md bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  {departmentObj.code} &bull; {departmentObj.name}
                </span>
              )}
              <span className="rounded-md bg-white/15 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-blue-100">
                TA {data.academicYear}
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
              Kelas {data.name}
            </h1>
            <p className="mt-1.5 text-sm font-medium text-blue-100 flex items-center gap-2">
              <UserCheck className="size-4 text-blue-200" />
              <span>Wali Kelas: {homeroomName}</span>
            </p>
          </div>

          {/* Quick Stats Pill Box */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Siswa Rombel
              </p>
              <p className="text-lg font-extrabold text-white">
                {studentCount}{" "}
                <span className="text-xs font-medium text-blue-200">
                  / {data.maxCapacity}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Kelas Mapel
              </p>
              <p className="text-lg font-extrabold text-white">
                {courseClassCount}{" "}
                <span className="text-xs font-medium text-blue-200">Mapel</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rombel-Level Enrollment Status Summary (Preserved at Rombel Level per Task 5) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="size-4 text-[#0066FF]" />
            <span>Status Enrollment Siswa Rombel {data.name}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {studentCount} siswa aktif terdaftar di Rombel {data.name} pada{" "}
            {courseClassCount} Kelas Mapel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            Siswa Aktif Rombel: {studentCount}
          </span>
          {courseClassesList.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${
                courseClassesList.every(
                  (c) =>
                    (c.enrollmentMonitoring?.missingCount ?? c.missingCount ?? 0) === 0
                )
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {courseClassesList.every(
                (c) =>
                  (c.enrollmentMonitoring?.missingCount ?? c.missingCount ?? 0) === 0
              ) ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>100% Terdaftar di Seluruh Mapel</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3.5 text-amber-600" />
                  <span>Periksa Kelengkapan di Detail Mapel</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation: Kelas Mapel vs Daftar Siswa */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("mapel")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "mapel"
                ? "bg-[#0066FF] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>Daftar Kelas Mapel ({courseClassesList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "students"
                ? "bg-[#0066FF] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Users className="size-3.5" />
            <span>Anggota Siswa Rombel ({studentsList.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Simplified Mapel Classroom Containers (Modeled after Siswa SubjectCourseCard — Task 4 & Task 5) */}
      {activeTab === "mapel" && (
        <section className="space-y-4">
          {courseClassesList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
              <BookOpen className="mx-auto size-10 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Belum Ada Kelas Mapel di Rombel Ini
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Rombel <strong>{data.name}</strong> sudah terdaftar, namun belum ada guru yang
                membuat atau menautkan Kelas Mata Pelajaran (CourseClass) ke rombel ini.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courseClassesList.map((cc) => {
                const teacherObj = cc.teacher || cc.teacherId || null;
                const teacherLabel =
                  cc.teacherName ||
                  (teacherObj
                    ? `${teacherObj.name}${teacherObj.degree ? `, ${teacherObj.degree}` : ""}`
                    : "Guru Belum Ditentukan");
                const categoryLabel =
                  cc.subject?.category || cc.category || "Mata Pelajaran";

                return (
                  <div
                    key={cc._id}
                    onClick={() => handleOpenCourseClass(cc._id)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#e4e6ef] bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-[#674ce7] hover:shadow-md cursor-pointer"
                  >
                    {/* Header Banner matching Siswa SubjectCourseCard */}
                    <div>
                      <div className="relative h-28 bg-gradient-to-br from-[#20103f] via-[#3f287d] to-[#674ce7] p-4 text-white flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                            {categoryLabel}
                          </span>
                          {role === "admin" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteError(null);
                                setDeleteTargetMapel(cc);
                              }}
                              title={`Hapus Kelas Mapel ${cc.name}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/90 hover:bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>Hapus Kelas Mapel</span>
                            </button>
                          )}
                        </div>
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight line-clamp-1">
                          {cc.name}
                        </h3>
                      </div>

                      {/* Body matching Siswa SubjectCourseCard */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <GraduationCap className="size-4 text-[#674ce7] shrink-0" />
                          <span className="truncate">{teacherLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer matching Siswa SubjectCourseCard */}
                    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 flex items-center justify-between">
                      <span className="rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-[10px] font-bold text-[#674ce7]">
                        {cc.studentCount} Siswa
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCourseClass(cc._id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-[#674ce7] group-hover:translate-x-0.5 transition cursor-pointer"
                      >
                        <span>Buka Mapel</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Students Roster in this Rombel */}
      {activeTab === "students" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Daftar Anggota Siswa Rombel {data.name}
              </h2>
              <p className="text-xs text-slate-500">
                Total {studentsList.length} siswa aktif terdaftar pada rombel ini
              </p>
            </div>
          </div>

          {studentsList.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Belum ada siswa yang ditempatkan di rombel {data.name}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studentsList.map((st, idx) => (
                <div
                  key={st._id || idx}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700">
                      {st.name ? st.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{st.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {st.nis && st.nis !== "-"
                          ? `NIS: ${st.nis}`
                          : st.nisn && st.nisn !== "-"
                          ? `NISN: ${st.nisn}`
                          : st.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {st.gender && st.gender !== "-" && (
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                        {st.gender === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Confirmation Dialog for Deleting Individual Mapel Class (TASK 4) */}
      {deleteTargetMapel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-mapel-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3
                  id="delete-mapel-title"
                  className="text-base font-extrabold text-slate-900"
                >
                  Hapus Kelas Mapel?
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus Kelas Mapel{" "}
                  <strong className="text-slate-900">{deleteTargetMapel.name}</strong> dari
                  Rombel <strong className="text-slate-900">{data.name}</strong>?
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 space-y-1.5">
              <p className="font-bold">Konsekuensi Penghapusan:</p>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Seluruh konten kelas terkait — termasuk Materi, Tugas, Kuis / Ulangan Harian,
                pengumpulan jawaban &amp; nilai siswa pada kelas mapel ini, serta diskusi kelas —
                akan dihapus secara permanen. Rombel <strong>{data.name}</strong> dan akun siswa
                tidak akan terhapus.
              </p>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-100 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
              >
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingMapel}
                onClick={() => {
                  setDeleteTargetMapel(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingMapel}
                onClick={handleConfirmDeleteMapel}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
              >
                {deletingMapel ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>Hapus Kelas Mapel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
