import Link from "next/link";
import {
  BookOpen,
  CirclePlus,
  Download,
  FileArchive,
  FileText,
  Filter,
  MoreHorizontal,
  PlaySquare,
  UserRound,
} from "lucide-react";

export type SubjectCardData = {
  title: string;
  teacher: string;
  category: string;
  progress: number;
  tone: "purple" | "green" | "orange" | "blue" | "gold";
  avatars?: number;
};

const toneMap: Record<SubjectCardData["tone"], string> = {
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
  return (
    <footer className="mt-24 flex flex-col gap-4 border-t border-[#e5e7ef] py-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>© 2024 Learnix LMS. All rights reserved.</p>
      <div className="flex gap-8">
        <Link href="#">Privacy Policy</Link>
        <Link href="#">Terms of Service</Link>
        <Link href="#">Contact Support</Link>
      </div>
    </footer>
  );
}

export function JoinClassBanner() {
  return (
    <section className="relative min-h-[210px] overflow-hidden rounded-xl bg-[var(--primary)] px-8 py-12 text-white shadow-sm">
      <div className="absolute right-[-34px] top-[-34px] size-40 rounded-full bg-white/10" />
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.03em]">
        Join Kelas Mapel
      </h1>
      <button className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-extrabold text-[var(--primary)] transition duration-300 hover:-translate-y-1">
        <CirclePlus className="size-5" />
        Join Kelas Baru
      </button>
    </section>
  );
}

export function AverageScoreCard() {
  return (
    <section className="rounded-xl border border-[#e4e6ef] bg-white p-7 shadow-sm">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
        Nilai rata-rata
      </h2>
      <div className="mt-8 flex items-end gap-3">
        <span className="font-[family-name:var(--font-display)] text-6xl font-extrabold leading-none">
          91
        </span>
        <span className="mb-2 text-xl font-extrabold text-[var(--primary)]">/ 100</span>
      </div>
      <div className="mt-7 h-2 rounded-full bg-[#e7ebf5]">
        <div className="h-full w-[83%] rounded-full bg-[var(--primary)] transition-[width] duration-700" />
      </div>
      <p className="mt-8 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Terus semangat
      </p>
    </section>
  );
}

export function DashboardSubjectCard({
  title,
  subtitle,
  urgent,
  completed,
}: {
  title: string;
  subtitle: string;
  urgent?: string;
  completed?: boolean;
}) {
  return (
    <article className={`rounded-xl border border-[#e4e6ef] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] ${completed ? "border-t-8 border-t-[#00796f]" : "border-t-8 border-t-[var(--primary)]"}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className={`grid size-7 place-items-center rounded-md ${completed ? "bg-[#e3f6f2] text-[#00796f]" : "bg-[#e5f1ff] text-[var(--primary)]"}`}>
          <BookOpen className="size-4" />
        </span>
      </div>
      <p className={`mt-7 text-[11px] font-extrabold uppercase ${completed ? "text-[#00796f]" : "text-red-600"}`}>
        {completed ? "All tasks completed" : urgent}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <button className={`h-11 flex-1 rounded-md text-sm font-extrabold text-white transition duration-300 hover:-translate-y-0.5 ${completed ? "bg-[#00796f]" : "bg-[var(--primary)]"}`}>
          LIHAT
        </button>
        <button className="grid size-9 place-items-center rounded-md border border-[#d9deeb] bg-white text-slate-500 transition hover:text-[var(--primary)]">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </article>
  );
}

export function TaskList() {
  const tasks = [
    ["Read: UX Principles Ch. 5", "KIK Konten", "Pending", "blue"],
    ["Quiz Mingguan", "Database Systems", "In Progress", "orange"],
    ["Upload Project: UI Prototype", "Interaction Design", "Late", "red"],
  ];

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Tugas</h2>
        <span className="rounded bg-red-100 px-3 py-1 text-[10px] font-extrabold uppercase text-red-600">
          3 urgent
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white">
        {tasks.map(([title, subject, status, tone]) => (
          <div key={title} className="flex items-center gap-4 border-b border-[#e4e6ef] p-4 last:border-0">
            <span className={`grid size-10 place-items-center rounded-full ${tone === "blue" ? "bg-[#e5f1ff] text-[var(--primary)]" : tone === "orange" ? "bg-orange-100 text-orange-500" : "bg-red-100 text-red-500"}`}>
              <BookOpen className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{title}</p>
              <p className="text-xs text-slate-500">{subject}</p>
            </div>
            <span className={`rounded px-3 py-1 text-[10px] font-extrabold uppercase ${tone === "blue" ? "bg-slate-100 text-slate-500" : tone === "orange" ? "bg-orange-100 text-orange-500" : "bg-red-100 text-red-500"}`}>
              {status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SharedFileCard({ type }: { type: "pdf" | "docx" | "pptx" }) {
  const icon = type === "pdf" ? FileArchive : type === "docx" ? FileText : PlaySquare;
  const Icon = icon;
  return (
    <article className="flex items-center gap-4 rounded-xl border border-[#e4e6ef] bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]">
      <span className="grid size-12 place-items-center rounded-md bg-slate-100 text-slate-500">
        <Icon className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">lorem ipsum dolor</p>
        <p className="text-xs text-slate-500">{type === "pdf" ? "2.4 MB" : type === "docx" ? "1.1 MB" : "5.8 MB"} • lorem ipsum dolor</p>
      </div>
      <Download className="size-5 text-slate-500" />
    </article>
  );
}

export function FilterControls() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1">
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Semester</span>
        <select className="h-10 rounded-md border border-[#d9deeb] bg-white px-3 text-xs outline-none transition focus:border-[#674ce7] focus:ring-2 focus:ring-[#eee9ff]">
          <option>4</option>
          <option>3</option>
          <option>2</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Mata Pelajaran</span>
        <select className="h-10 rounded-md border border-[#d9deeb] bg-white px-3 text-xs outline-none transition focus:border-[#674ce7] focus:ring-2 focus:ring-[#eee9ff]">
          <option>Semua Mapel</option>
          <option>Desain</option>
          <option>Matematika</option>
        </select>
      </label>
      <button className="grid size-10 place-items-center rounded-md border border-[#d9deeb] bg-white text-slate-600 transition hover:border-[#674ce7] hover:text-[#674ce7]">
        <Filter className="size-4" />
      </button>
    </div>
  );
}

export function SubjectCourseCard({ course }: { course: SubjectCardData }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]">
      <div className={`relative h-32 bg-gradient-to-br ${toneMap[course.tone]}`}>
        <span className="absolute left-4 top-4 rounded bg-[#674ce7] px-2 py-1 text-[9px] font-extrabold uppercase text-white">
          {course.category}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold">{course.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <UserRound className="size-3.5" />
          {course.teacher}
        </p>
        <div className="mt-7 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          <span>Progress Tugas</span>
          <span className="text-[#674ce7]">{course.progress}%</span>
        </div>
        <div className="mt-2">
          <SmoothProgress value={course.progress} />
        </div>
        <div className="mt-7 flex items-center justify-between">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((item) => (
              <span key={item} className="size-6 rounded-full border-2 border-white bg-slate-300" />
            ))}
            <span className="grid size-6 place-items-center rounded-full border-2 border-white bg-[#eee9ff] text-[9px] font-bold text-[#674ce7]">
              +{course.avatars ?? 12}
            </span>
          </div>
          <button className="rounded-md border border-[#ded4ff] bg-[#fbf8ff] px-5 py-2 text-xs font-semibold text-[#674ce7] transition duration-300 hover:-translate-y-0.5 hover:bg-[#eee9ff]">
            Enter Class
          </button>
        </div>
      </div>
    </article>
  );
}

export function JoinNewCourseCard() {
  return (
    <article className="grid min-h-[344px] place-items-center rounded-xl border-2 border-dashed border-[#d9cfee] bg-[#fffbff] p-8 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#eee9ff] text-slate-600">
          <CirclePlus className="size-8" />
        </span>
        <h3 className="mt-8 font-[family-name:var(--font-display)] text-xl font-extrabold">Masuk ke Kelas Baru</h3>
        <p className="mt-3 max-w-48 text-sm leading-5 text-slate-500">
          Explore the curriculum catalog and find your next challenge.
        </p>
      </div>
    </article>
  );
}
