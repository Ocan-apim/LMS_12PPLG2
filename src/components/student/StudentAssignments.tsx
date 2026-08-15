"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  Filter,
  FlaskConical,
  SortAsc,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

type Status = "pending" | "late" | "completed";

type Assignment = {
  title: string;
  subject: string;
  dueDate: string;
  dueTime: string;
  status: Status;
  score?: string;
  href: string;
  icon: "file" | "flask" | "flow" | "math" | "code";
};

const assignments: Assignment[] = [
  {
    title: "Surat Lamaran Pekerjaan",
    subject: "Bahasa Indonesia",
    dueDate: "21 Juli 2026",
    dueTime: "11:59 PM",
    status: "late",
    href: "/siswa/courses?kelas=bahasa-indonesia&tugas=surat-lamaran-pekerjaan",
    icon: "file",
  },
  {
    title: "Konten KIK minggu 1",
    subject: "Pengenalan KIK",
    dueDate: "Tomorrow",
    dueTime: "5:00 PM",
    status: "pending",
    href: "/siswa/courses?kelas=pengenalan-kik&tugas=konten-kik-minggu-1",
    icon: "flask",
  },
  {
    title: "Pembuatan Flowchart",
    subject: "PBO",
    dueDate: "15 Juli 2026",
    dueTime: "11:59 PM",
    status: "pending",
    href: "/siswa/courses?kelas=pbo&tugas=pembuatan-flowchart",
    icon: "flow",
  },
  {
    title: "Vektor Bab 1",
    subject: "Matematika",
    dueDate: "11 Juli 2026",
    dueTime: "11:59 PM",
    status: "completed",
    score: "94 / 100",
    href: "/siswa/courses?kelas=matematika&tugas=vektor-bab-1",
    icon: "math",
  },
  {
    title: "Data Structures & Algorithms: Binary Trees",
    subject: "PWPB",
    dueDate: "4 Juli 2026",
    dueTime: "11:59 PM",
    status: "completed",
    score: "94 / 100",
    href: "/siswa/courses?kelas=pwpb&tugas=binary-trees",
    icon: "code",
  },
];

const statusLabel: Record<Status, string> = {
  pending: "Pending",
  late: "Late",
  completed: "Graded",
};

const iconMap = {
  file: FileText,
  flask: FlaskConical,
  flow: SortAsc,
  math: CheckCircle2,
  code: Code2,
};

export function StudentAssignments() {
  const filters: { value: "active" | Status; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "late", label: "Missing" },
    { value: "completed", label: "Completed" },
  ];

  const lateFirst = [...assignments].sort((a, b) => {
    if (a.status === "late" && b.status !== "late") return -1;
    if (a.status !== "late" && b.status === "late") return 1;
    return 0;
  });

  return (
    <div className="animate-fade-up px-2">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
            Assignments
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Manage your academic workload and track progress.
          </p>
        </div>
        <div className="rounded-xl bg-white p-1 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={`rounded-lg px-8 py-3 text-xs font-bold transition ${
                filter.value === "active" ? "bg-[#f4edff] text-[#674ce7]" : "text-slate-600"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#d9deeb] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7ef] px-6 py-4">
          <div className="flex gap-6 text-xs font-bold text-slate-600">
            <button className="inline-flex items-center gap-2">
              <Filter className="size-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2">
              <SortAsc className="size-4" />
              Sort by Due Date
            </button>
          </div>
          <p className="text-xs text-slate-500">Showing 8 active tasks</p>
        </div>

        <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.45fr_0.5fr] border-b border-[#e5e7ef] bg-[#fbf8ff] px-6 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
          <span>Task Name</span>
          <span>Subject</span>
          <span>Due Date</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {lateFirst.map((assignment) => {
          const Icon = iconMap[assignment.icon];
          return (
            <div
              key={assignment.title}
              className="grid min-h-[88px] grid-cols-[1.4fr_0.8fr_0.6fr_0.45fr_0.5fr] items-center border-b border-[#e5e7ef] px-6 py-4 last:border-0"
            >
              <div className="flex items-center gap-4">
                <span className={`grid size-8 place-items-center rounded-md ${
                  assignment.status === "late"
                    ? "bg-red-50 text-red-500"
                    : assignment.status === "completed"
                      ? "bg-[#d4f8ec] text-[#00796f]"
                      : "bg-[#eee9ff] text-[#674ce7]"
                }`}>
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{assignment.title}</span>
              </div>
              <span className="text-sm text-slate-600">{assignment.subject}</span>
              <span className={`text-sm font-extrabold ${assignment.status === "late" ? "text-red-600" : ""}`}>
                {assignment.dueDate}
                <span className="block text-xs font-medium text-slate-500">{assignment.dueTime}</span>
              </span>
              <span>
                <span className={`inline-flex rounded px-3 py-1 text-[10px] font-extrabold uppercase ${
                  assignment.status === "late"
                    ? "bg-red-600 text-white"
                    : assignment.status === "completed"
                      ? "bg-[#00796f] text-white"
                      : "bg-[#e3ddec] text-slate-600"
                }`}>
                  {statusLabel[assignment.status]}
                </span>
                {assignment.score ? (
                  <span className="mt-1 block text-[11px] font-extrabold text-[#00796f]">
                    {assignment.score}
                  </span>
                ) : null}
              </span>
              <span className="text-right">
                <Link
                  href={assignment.href}
                  className="inline-flex rounded-md border border-[#cfd3df] px-5 py-2 text-xs font-semibold transition hover:border-[#674ce7] hover:text-[#674ce7]"
                >
                  View Details
                </Link>
              </span>
            </div>
          );
        })}

        <div className="flex items-center justify-between px-6 py-5 text-xs text-slate-600">
          <span>Page 1 of 3</span>
          <div className="flex gap-2">
            <button className="grid size-8 place-items-center rounded-md border border-[#e5e7ef] text-slate-300">
              <ChevronLeft className="size-4" />
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                className={`grid size-8 place-items-center rounded-md border text-xs font-bold ${
                  page === 1 ? "border-[#ded4ff] bg-[#f3edff] text-[#674ce7]" : "border-[#e5e7ef]"
                }`}
              >
                {page}
              </button>
            ))}
            <button className="grid size-8 place-items-center rounded-md border border-[#e5e7ef]">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <SummaryCard icon={AlertCircle} label="Needs Attention" value="1 Tasks" tone="red" />
        <SummaryCard icon={CalendarDays} label="Due This Week" value="3 Tasks" tone="purple" />
        <SummaryCard icon={CheckCircle2} label="Average Score" value="88%" tone="green" />
      </div>

      <FooterBar />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "red" | "purple" | "green";
}) {
  return (
    <article className="flex items-center gap-5 rounded-xl border border-[#d9cfee] bg-[#fbf8ff] p-6">
      <span className={`grid size-14 place-items-center rounded-xl ${
        tone === "red" ? "bg-red-100 text-red-600" : tone === "purple" ? "bg-[#ded8ff] text-[#674ce7]" : "bg-[#d4f8ec] text-[#00796f]"
      }`}>
        <Icon className="size-7" />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold ${
          tone === "red" ? "text-red-600" : tone === "purple" ? "text-[#674ce7]" : "text-[#00796f]"
        }`}>
          {value}
        </p>
      </div>
    </article>
  );
}
