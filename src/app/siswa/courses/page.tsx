import {
  FilterControls,
  JoinNewCourseCard,
  SubjectCourseCard,
  type SubjectCardData,
} from "@/components/student/StudentDashboardComponents";

const courses: SubjectCardData[] = [
  {
    title: "PWPB",
    teacher: "Bpk. Muhammad Daniel",
    category: "Design",
    progress: 78,
    tone: "purple",
    avatars: 12,
  },
  {
    title: "Matematika",
    teacher: "Ibu Refita",
    category: "Math",
    progress: 45,
    tone: "green",
    avatars: 8,
  },
  {
    title: "Bahasa Inggris",
    teacher: "Miss Wulan",
    category: "English",
    progress: 12,
    tone: "orange",
    avatars: 24,
  },
  {
    title: "Bahasa Indonesia",
    teacher: "Ibu Alyssa",
    category: "Indonesia",
    progress: 95,
    tone: "blue",
    avatars: 5,
  },
  {
    title: "Pengenalan KIK",
    teacher: "Ibu Suci",
    category: "Marketing",
    progress: 62,
    tone: "gold",
    avatars: 19,
  },
];

export default function SiswaCoursesPage() {
  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
          Mata Pelajaran
        </h1>
        <FilterControls />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <SubjectCourseCard key={course.title} course={course} />
        ))}
        <JoinNewCourseCard />
      </div>
    </div>
  );
}
