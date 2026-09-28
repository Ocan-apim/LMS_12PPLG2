"use client";

import { useState, useEffect, type ComponentType } from "react";
import Link from "next/link";
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
  Loader2,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { FooterBar } from "@/components/student/StudentDashboardComponents";

export type AssignmentStatus = "pending" | "late" | "completed";

export type AssignmentItem = {
  _id: string;
  title: string;
  subject: string;
  className?: string;
  teacherName?: string;
  dueDate: string;
  dueTime: string;
  rawDueDate?: string;
  status: AssignmentStatus;
  statusDetail?: string;
  score?: string;
  maxScore?: number;
  type?: string;
  href: string;
  icon: "file" | "flask" | "flow" | "math" | "code";
  isSubmitted?: boolean;
};

interface AssignmentsSummary {
  needsAttention: number;
  dueThisWeek: number;
  averageScore: number;
  counts: {
    all: number;
    active: number;
    late: number;
    completed: number;
  };
}

const statusLabel: Record<AssignmentStatus, string> = {
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
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "late" | "completed">("all");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [summary, setSummary] = useState<AssignmentsSummary>({
    needsAttention: 0,
    dueThisWeek: 0,
    averageScore: 0,
    counts: { all: 0, active: 0, late: 0, completed: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/siswa/assignments");
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Sesi Anda telah kedaluwarsa. Silakan login kembali.");
        }
        if (res.status === 403) {
          throw new Error("Akses ditolak. Halaman ini hanya untuk Siswa.");
        }
        throw new Error("Gagal mengambil data tugas.");
      }
      const data = await res.json();
      if (data.success && data.data) {
        setAssignments(data.data.assignments || []);
        if (data.data.summary) {
          setSummary(data.data.summary);
        }
      } else {
        throw new Error(data.message || "Format data tidak sesuai.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat tugas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const filters: { value: "all" | "active" | "late" | "completed"; label: string }[] = [
    { value: "all", label: `All (${summary.counts.all})` },
    { value: "active", label: `Active (${summary.counts.active})` },
    { value: "late", label: `Missing (${summary.counts.late})` },
    { value: "completed", label: `Completed (${summary.counts.completed})` },
  ];

  // Client-side filter matching
  const filteredAssignments = assignments.filter((a) => {
    if (activeFilter === "all") return true;
    return a.status === activeFilter;
  });

  // Sort late assignments first
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
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
            Kelola beban akademik dan pantau progres pengumpulan tugas Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-lg px-5 py-2.5 text-xs font-bold transition ${
                activeFilter === filter.value
                  ? "bg-[#f4edff] text-[#674ce7]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="size-8 animate-spin text-[#674ce7]" />
          <p className="text-sm font-semibold text-slate-600">Memuat daftar tugas...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <AlertCircle className="size-8 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchAssignments}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#674ce7] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#563cd6]"
          >
            <RefreshCw className="size-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <section className="overflow-hidden rounded-xl border border-[#d9deeb] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7ef] px-6 py-4">
            <div className="flex gap-6 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Filter className="size-4 text-[#674ce7]" />
                Filter: <span className="capitalize text-slate-900">{activeFilter}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <SortAsc className="size-4 text-[#674ce7]" />
                Tenggat Waktu
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Menampilkan {sortedAssignments.length} dari {assignments.length} tugas
            </p>
          </div>

          <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.45fr_0.5fr] border-b border-[#e5e7ef] bg-[#fbf8ff] px-6 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            <span>Nama Tugas</span>
            <span>Mata Pelajaran</span>
            <span>Tenggat Waktu</span>
            <span>Status</span>
            <span className="text-right">Aksi</span>
          </div>

          {sortedAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FolderOpen className="size-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Tidak ada tugas dalam kategori ini</p>
              <p className="max-w-md text-xs text-slate-500">
                {activeFilter === "late"
                  ? "Bagus sekali! Tidak ada tugas yang terlambat atau belum dikumpulkan."
                  : activeFilter === "active"
                    ? "Semua tugas yang aktif telah Anda selesaikan."
                    : "Belum ada tugas yang diterbitkan oleh guru pengampu Anda."}
              </p>
            </div>
          ) : (
            sortedAssignments.map((assignment) => {
              const Icon = iconMap[assignment.icon] || FileText;
              return (
                <div
                  key={assignment._id}
                  className="grid min-h-[88px] grid-cols-[1.4fr_0.8fr_0.6fr_0.45fr_0.5fr] items-center border-b border-[#e5e7ef] px-6 py-4 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-md ${
                        assignment.status === "late"
                          ? "bg-red-50 text-red-500"
                          : assignment.status === "completed"
                            ? "bg-[#d4f8ec] text-[#00796f]"
                            : "bg-[#eee9ff] text-[#674ce7]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block line-clamp-1">
                        {assignment.title}
                      </span>
                      {assignment.teacherName && (
                        <span className="text-xs text-slate-400 block">
                          Guru: {assignment.teacherName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 truncate">{assignment.subject}</span>
                  <span
                    className={`text-sm font-extrabold ${
                      assignment.status === "late" ? "text-red-600" : "text-slate-800"
                    }`}
                  >
                    {assignment.dueDate}
                    <span className="block text-xs font-medium text-slate-500">
                      {assignment.dueTime}
                    </span>
                  </span>
                  <span>
                    <span
                      className={`inline-flex rounded px-3 py-1 text-[10px] font-extrabold uppercase ${
                        assignment.status === "late"
                          ? "bg-red-600 text-white"
                          : assignment.status === "completed"
                            ? "bg-[#00796f] text-white"
                            : "bg-[#e3ddec] text-slate-600"
                      }`}
                    >
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
                      className="inline-flex rounded-md border border-[#cfd3df] px-5 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#674ce7] hover:bg-[#fbf8ff] hover:text-[#674ce7]"
                    >
                      Lihat Detail
                    </Link>
                  </span>
                </div>
              );
            })
          )}

          {sortedAssignments.length > 0 && (
            <div className="flex items-center justify-between px-6 py-5 text-xs text-slate-600 border-t border-[#e5e7ef]">
              <span>
                Total {sortedAssignments.length} tugas ditemukan
              </span>
              <div className="flex gap-2">
                <button
                  disabled
                  className="grid size-8 place-items-center rounded-md border border-[#e5e7ef] text-slate-300"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  className="grid size-8 place-items-center rounded-md border border-[#ded4ff] bg-[#f3edff] text-xs font-bold text-[#674ce7]"
                >
                  1
                </button>
                <button
                  disabled
                  className="grid size-8 place-items-center rounded-md border border-[#e5e7ef] text-slate-300"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Summary Metrics */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <SummaryCard
          icon={AlertCircle}
          label="Perlu Perhatian"
          value={`${summary.needsAttention} Tugas`}
          tone="red"
        />
        <SummaryCard
          icon={CalendarDays}
          label="Tenggat Minggu Ini"
          value={`${summary.dueThisWeek} Tugas`}
          tone="purple"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Nilai Rata-rata"
          value={summary.averageScore > 0 ? `${summary.averageScore}%` : "Belum Ada"}
          tone="green"
        />
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
    <article className="flex items-center gap-5 rounded-xl border border-[#d9cfee] bg-[#fbf8ff] p-6 shadow-sm">
      <span
        className={`grid size-14 shrink-0 place-items-center rounded-xl ${
          tone === "red"
            ? "bg-red-100 text-red-600"
            : tone === "purple"
              ? "bg-[#ded8ff] text-[#674ce7]"
              : "bg-[#d4f8ec] text-[#00796f]"
        }`}
      >
        <Icon className="size-7" />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <p
          className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold ${
            tone === "red"
              ? "text-red-600"
              : tone === "purple"
                ? "text-[#674ce7]"
                : "text-[#00796f]"
          }`}
        >
          {value}
        </p>
      </div>
    </article>
  );
}
