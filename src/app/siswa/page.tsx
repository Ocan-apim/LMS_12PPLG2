import Link from "next/link";
import {
  AverageScoreCard,
  DashboardSubjectCard,
  FooterBar,
  JoinClassBanner,
  SharedFileCard,
  TaskList,
} from "@/components/student/StudentDashboardComponents";

export default function SiswaDashboardPage() {
  return (
    <div className="animate-fade-up">
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <JoinClassBanner />
        <AverageScoreCard />
      </div>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_390px]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
              Mata Pelajaran
            </h2>
            <Link
              href="/siswa/courses"
              className="text-xs font-extrabold text-[var(--primary)]"
            >
              View All &gt;
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <DashboardSubjectCard
              title="PWPB"
              subtitle="Lorem Ipsum"
              urgent="Due Next: Quiz #4 - Today, 5PM"
            />
            <DashboardSubjectCard
              title="Database Systems"
              subtitle="Lorem Ipsum"
              completed
            />
          </div>
        </section>

        <TaskList />
      </div>

      <section className="mt-8">
        <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl font-extrabold">
          File yang dibagi
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <SharedFileCard type="pdf" />
          <SharedFileCard type="docx" />
          <SharedFileCard type="pptx" />
        </div>
      </section>

      <FooterBar />
    </div>
  );
}
