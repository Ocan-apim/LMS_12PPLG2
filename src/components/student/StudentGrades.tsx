import Link from "next/link";
import {
  BarChart3,
  Beaker,
  BookOpen,
  Code2,
  MoreHorizontal,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { BackButton } from "@/components/student/BackButton";
import { FooterBar, SmoothProgress } from "@/components/student/StudentDashboardComponents";

const breakdown = [
  ["Advanced Mathematics", "Dr. Sarah Weaver", "A", 98, "Exceptional logic and consistency in complex..."],
  ["Applied Physics", "Prof. Michael Chen", "B+", 92, "Great laboratory work; continue refining..."],
  ["Computer Science II", "Engr. David Smith", "A-", 100, "Excellent grasp of data structures. Project..."],
  ["Digital Ethics", "Dr. Linda Blair", "A", 85, "Very insightful essays. Participation in debates"],
];

const icons = [BookOpen, Beaker, Code2, Star];

export function StudentGrades() {
  return (
    <div className="animate-fade-up px-2">
      <BackButton />
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
          Performance Overview
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Track your academic progress and grade distribution for Juli 2026
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
        <section className="relative overflow-hidden rounded-xl border border-[#d9deeb] bg-white p-7 shadow-sm">
          <p className="text-xs font-bold text-slate-600">Current GPA</p>
          <div className="mt-5 flex items-end gap-2">
            <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold text-[#674ce7]">93</span>
            <span className="mb-2 text-sm text-slate-600">/ 100</span>
          </div>
          <div className="mt-8">
            <SmoothProgress value={93} />
          </div>
          <Star className="absolute -bottom-4 right-[-10px] size-24 text-slate-100" />
        </section>

        <section className="rounded-xl border border-[#d9deeb] bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold">Grade Trends</p>
              <p className="text-xs text-slate-500">Monthly performance average</p>
            </div>
            <div className="flex gap-5 text-xs">
              <span className="before:mr-1 before:inline-block before:size-2 before:rounded-full before:bg-[#674ce7]">2024</span>
              <span className="before:mr-1 before:inline-block before:size-2 before:rounded-full before:bg-slate-300">2023</span>
            </div>
          </div>
          <div className="mt-8 h-32">
            <svg viewBox="0 0 680 140" className="h-full w-full">
              {[20, 50, 80, 110].map((y) => (
                <line key={y} x1="0" x2="680" y1={y} y2={y} stroke="#edf0f6" />
              ))}
              <path
                d="M0 105 C105 68 185 68 255 76 C350 88 412 118 515 87 C595 63 630 38 680 6"
                fill="none"
                stroke="#674ce7"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => (
                <text key={month} x={index * 125 + 8} y="136" fontSize="12" fill="#64748b">
                  {month}
                </text>
              ))}
            </svg>
          </div>
        </section>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#d9deeb] bg-white shadow-sm">
        <div className="flex items-center justify-between p-7">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">Subject Breakdown</h2>
          <div className="flex gap-2">
            <button className="grid size-9 place-items-center rounded-md border border-[#d9deeb]">
              <SlidersHorizontal className="size-4" />
            </button>
            <button className="grid size-9 place-items-center rounded-md border border-[#d9deeb]">
              <BarChart3 className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[1.5fr_0.5fr_0.6fr_1.4fr_0.3fr] border-y border-[#e5e7ef] bg-[#fbf8ff] px-7 py-4 text-[11px] font-extrabold text-slate-500">
          <span>Subject Name</span>
          <span>Grade</span>
          <span>Attendance</span>
          <span>Teacher Feedback</span>
          <span>Actions</span>
        </div>
        {breakdown.map(([subject, teacher, grade, attendance, feedback], index) => {
          const Icon = icons[index];
          return (
            <div key={subject} className="grid min-h-[74px] grid-cols-[1.5fr_0.5fr_0.6fr_1.4fr_0.3fr] items-center border-b border-[#e5e7ef] px-7 last:border-0">
              <div className="flex items-center gap-4">
                <span className="grid size-9 place-items-center rounded-md bg-[#eee9ff] text-[#674ce7]">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">{subject}</p>
                  <p className="text-xs text-slate-500">{teacher}</p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-[#00796f] px-4 py-1 text-xs font-extrabold text-white">{grade}</span>
              <div>
                <p className="text-sm font-bold">{attendance}%</p>
                <div className="mt-2 h-1.5 w-16 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#00796f]" style={{ width: `${attendance}%` }} />
                </div>
              </div>
              <span className="text-sm text-slate-600">{feedback}</span>
              <button className="text-slate-600">
                <MoreHorizontal className="size-5" />
              </button>
            </div>
          );
        })}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <EventPanel title="Remedial" titleClass="text-red-600" />
        <EventPanel title="Upcoming Exams" />
      </div>

      <FooterBar />
    </div>
  );
}

function EventPanel({ title, titleClass = "" }: { title: string; titleClass?: string }) {
  return (
    <section className="rounded-xl border border-[#d9deeb] bg-white p-7 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className={`font-[family-name:var(--font-display)] text-xl font-extrabold ${titleClass}`}>{title}</h2>
        <Link href="/siswa/schedule" className="text-xs font-extrabold text-[#674ce7]">
          View Calendar
        </Link>
      </div>
      <div className="mt-6 space-y-4">
        {[24, 27].map((day, index) => (
          <article key={day} className="flex items-center gap-5 rounded-lg bg-[#f3edff] p-4">
            <span className="grid size-12 place-items-center rounded border border-[#ded4ff] bg-white text-center text-[10px] font-bold text-[#674ce7]">
              {day}
              <span className="block text-[9px] text-slate-500">JULI</span>
            </span>
            <div>
              <p className="text-sm font-extrabold">{index === 0 ? "Ujian MTK" : "Ujian Fisika"}</p>
              <p className="text-xs text-slate-500">{index === 0 ? "Room 302 - 09:00 AM" : "Online Submission"}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
