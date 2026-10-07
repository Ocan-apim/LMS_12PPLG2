"use client";

import { useEffect, useState, useTransition } from "react";
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
} from "lucide-react";
import {
  SubjectCourseCard,
  type SubjectCardData,
} from "@/components/student/StudentDashboardComponents";
import { SharedClassDetail } from "@/components/class/SharedClassDetail";

interface TeacherInfo {
  _id?: string;
  name: string;
  email?: string;
  nip?: string;
  degree?: string;
}

interface CourseClassItem {
  _id: string;
  name: string;
  code: string;
  teacherId?: TeacherInfo;
  teacherName?: string;
  category?: string;
  assignmentCount?: number;
  quizCount?: number;
  studentCount?: number;
  bannerColor?: string;
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
  maxCapacity?: number;
  courseClasses?: CourseClassItem[];
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
  const studentCount = Array.isArray(rombel.studentIds) ? rombel.studentIds.length : 0;

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href={backHref} className="hover:text-[#0066FF] flex items-center gap-1 transition">
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">Pratinjau Kelas: {rombel.name}</span>
      </div>

      {/* Staff Read-Only Notice Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-center shadow-xs">
        <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
          Mode Pratinjau Staf (Baca-Saja)
        </p>
        <p className="mt-0.5 text-xs text-blue-700">
          Anda melihat pratinjau rombel ini dalam mode baca-saja. Pilih salah satu mata pelajaran (Kelas Mapel) di bawah untuk memantau aktivitas pembelajaran (Tugas, Ulangan Harian, Materi, dan Komentar).
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
          {rombel.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-blue-100">
          <div className="flex items-center gap-1.5 font-medium">
            <GraduationCap className="size-4 text-blue-200" />
            <span>Wali Kelas: <strong className="text-white">{homeroomTeacher}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="size-4 text-blue-200" />
            <span>Kapasitas: <strong className="text-white">{studentCount} / {rombel.maxCapacity || 36} Siswa</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <BookOpen className="size-4 text-blue-200" />
            <span>Mata Pelajaran: <strong className="text-white">{courseClasses.length} Mapel</strong></span>
          </div>
        </div>
      </div>

      {/* Mapel Cards Section */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="size-5 text-blue-600" />
              Mata Pelajaran di Kelas {rombel.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pada salah satu kartu mapel untuk melihat aktivitas tugas, kuis, dan materi pembelajaran
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 self-start sm:self-auto">
            {courseClasses.length} Mapel Terbuka
          </span>
        </div>

        {courseClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
            <FolderOpen className="mx-auto size-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              Belum Ada Mata Pelajaran
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              Belum ada kelas mapel yang terdaftar atau dihubungkan ke rombel {rombel.name}.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courseClasses.map((cc) => {
              const cardData: SubjectCardData = {
                _id: cc._id,
                title: cc.name,
                teacher: cc.teacherName || cc.teacherId?.name || "Guru Pengampu",
                classNameSubtitle: `Kelas: ${rombel.name}`,
                category: cc.category || "Kejuruan",
                assignmentCount: cc.assignmentCount ?? 0,
                quizCount: cc.quizCount ?? 0,
                bannerColor: cc.bannerColor || "blue",
                avatars: cc.studentCount ?? studentCount,
                actionLabel: "Buka Mapel",
              };

              return (
                <SubjectCourseCard
                  key={cc._id}
                  course={cardData}
                  customHref={`${baseClassHref}?courseId=${cc._id}`}
                  actionLabel="Buka Mapel"
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
