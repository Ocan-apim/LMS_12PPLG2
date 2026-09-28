"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FilterControls,
  JoinNewCourseCard,
  SubjectCourseCard,
  type SubjectCardData,
} from "@/components/student/StudentDashboardComponents";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface CourseItem {
  _id: string;
  name: string;
  code: string;
  bannerColor: string;
  academicYear: string;
  teacher: string;
  teacherDegree?: string;
  subject: string;
  category: string;
  rombel?: string;
  studentCount: number;
  totalAssignments: number;
  completedAssignments: number;
  progress: number;
  createdAt: string;
}

export default function SiswaCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSemester, setSelectedSemester] = useState("Semua");
  const [selectedSubject, setSelectedSubject] = useState("Semua");

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/courses");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat daftar kelas");
      }
      setCourses(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Distinct subjects for filter dropdown
  const subjectList = useMemo(() => {
    const list = Array.from(new Set(courses.map((c) => c.subject || c.name)));
    return list;
  }, [courses]);

  // Client-side filtering
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSubject =
        selectedSubject === "Semua" ||
        (c.subject || c.name).toLowerCase() === selectedSubject.toLowerCase();
      const matchSemester =
        selectedSemester === "Semua" ||
        (c.academicYear &&
          c.academicYear.toLowerCase().includes(selectedSemester.toLowerCase()));
      return matchSubject && matchSemester;
    });
  }, [courses, selectedSubject, selectedSemester]);

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
          Mata Pelajaran
        </h1>
        <FilterControls
          semester={selectedSemester}
          onSemesterChange={setSelectedSemester}
          subject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          subjects={subjectList}
        />
      </div>

      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#0066FF]" />
          <p className="text-sm font-semibold text-slate-500">Memuat mata pelajaran...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-base font-bold text-red-800">Gagal Memuat Kelas</h2>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchCourses}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition"
          >
            <RefreshCw className="size-4" />
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((c) => {
            const cardData: SubjectCardData = {
              _id: c._id,
              title: c.name,
              teacher: c.teacherDegree ? `${c.teacher}, ${c.teacherDegree}` : c.teacher,
              category: c.category || "Kejuruan",
              progress: c.progress || 0,
              bannerColor: c.bannerColor || "blue",
              avatars: c.studentCount || 1,
            };
            return <SubjectCourseCard key={c._id} course={cardData} />;
          })}
          <JoinNewCourseCard />
        </div>
      )}
    </div>
  );
}
