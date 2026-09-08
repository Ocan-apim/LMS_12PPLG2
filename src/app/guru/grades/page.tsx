"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Download,
  BookOpen,
  Users,
  Award,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface TeacherClassOption {
  _id: string;
  name: string;
  code: string;
  classRombelId?: {
    name: string;
    grade: string;
  };
}

interface GradeAssignment {
  _id: string;
  title: string;
  maxScore: number;
  type: string;
}

interface MatrixStudent {
  student: {
    _id: string;
    name: string;
    nisn?: string;
    email: string;
  };
  scores: Record<string, number | null>;
  average: number;
  gradeLetter: string;
  status: string;
}

interface RecentSubmission {
  _id: string;
  studentId?: {
    _id: string;
    name: string;
    nisn?: string;
  };
  assignmentId?: {
    _id: string;
    title: string;
    maxScore: number;
  };
  status: string;
  score?: number;
  submittedAt: string;
}

interface GradebookData {
  classes: TeacherClassOption[];
  selectedClass?: {
    _id: string;
    name: string;
    code: string;
    classRombelId?: {
      name: string;
    };
  };
  assignments: GradeAssignment[];
  matrix: MatrixStudent[];
  stats: {
    classAverage: number;
    pendingCount: number;
    topPerformers: Array<{ name: string; score: number }>;
    gradeDistribution: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
  };
  recentSubmissions: RecentSubmission[];
}

function PenilaianContent() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("courseClassId") || "";

  const [data, setData] = useState<GradebookData | null>(null);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGradebook() {
      setLoading(true);
      try {
        const query = selectedClassId ? `?courseClassId=${selectedClassId}` : "";
        const res = await fetch(`/api/guru/grades${query}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          if (!selectedClassId && json.data.selectedClass?._id) {
            setSelectedClassId(json.data.selectedClass._id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat rekap nilai:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGradebook();
  }, [selectedClassId]);

  function handleExportCsv() {
    if (!selectedClassId) return;
    window.open(`/api/guru/grades/export?courseClassId=${selectedClassId}`, "_blank");
  }

  const getScoreBadge = (score: number | null | undefined, max: number) => {
    if (score === null || score === undefined) {
      return <span className="text-muted-foreground font-mono">-</span>;
    }
    const percent = (score / max) * 100;
    if (percent >= 85) {
      return (
        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
          {score}
        </span>
      );
    }
    if (percent >= 75) {
      return (
        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
          {score}
        </span>
      );
    }
    if (percent >= 60) {
      return (
        <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
          {score}
        </span>
      );
    }
    return (
      <span className="font-bold text-red-600 dark:text-red-400 font-mono">
        {score}
      </span>
    );
  };

  const getGradeBadge = (letter: string) => {
    switch (letter) {
      case "A":
        return <Badge variant="green">A</Badge>;
      case "B":
        return <Badge variant="blue">B</Badge>;
      case "C":
        return <Badge variant="orange">C</Badge>;
      default:
        return <Badge variant="red">{letter}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Image 3 Bottom */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Buku Nilai & Laporan
            </span>
            <span className="text-xs text-muted-foreground">Tahun Ajaran 2026/2027</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Rekap Nilai Siswa
          </h1>
          <p className="text-sm text-muted-foreground">
            Buku nilai per kelas dengan matriks penugasan dan unduh laporan akademik siswa format CSV / Excel.
          </p>
        </div>

        {/* Action Button: Download Excel / CSV */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCsv}
            disabled={!selectedClassId || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            leftIcon={<FileSpreadsheet className="size-4" />}
          >
            Download Excel / CSV
          </Button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-blue-600" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Pilih Kelas Mapel:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={loading}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {data?.classes?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.classRombelId?.name ? `(${c.classRombelId.name})` : ""} [{c.code}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards Row */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Class Average */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Rata-rata Kelas</span>
              <p className="text-2xl font-black text-foreground">
                {data.stats.classAverage}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <TrendingUp className="size-3" /> Standar KKM 75
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <BookOpen className="size-5" />
            </div>
          </div>

          {/* Pending Submissions to Grade */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Perlu Dinilai</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {data.stats.pendingCount}
              </p>
              <span className="text-[10px] text-muted-foreground">Tugas / Kuis siswa</span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="size-5" />
            </div>
          </div>

          {/* Top Performer */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Nilai Tertinggi</span>
              <p className="text-base font-bold text-foreground line-clamp-1">
                {data.stats.topPerformers[0]?.name || "-"}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                {data.stats.topPerformers[0]?.score ? `Skor: ${data.stats.topPerformers[0].score}` : "Belum ada nilai"}
              </span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Award className="size-5" />
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Distribusi Nilai</span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <span className="text-emerald-600">A:{data.stats.gradeDistribution.A}</span>
                <span className="text-blue-600">B:{data.stats.gradeDistribution.B}</span>
                <span className="text-amber-600">C:{data.stats.gradeDistribution.C}</span>
                <span className="text-red-600">D:{data.stats.gradeDistribution.D}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Total {data.matrix.length} Siswa</span>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
              <Users className="size-5" />
            </div>
          </div>
        </div>
      )}

      {/* Gradebook Matrix Table matching User Request & Image 3 Bottom */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div>
            <h3 className="font-bold text-foreground text-sm">
              Matriks Buku Nilai Siswa
            </h3>
            <p className="text-xs text-muted-foreground">
              Kolom penugasan menampilkan skor masing-masing tugas dan kuis siswa.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {data?.assignments?.length || 0} Penugasan Aktif
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Memuat buku nilai siswa...
          </div>
        ) : !data || data.matrix.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Belum ada siswa atau penugasan di kelas ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-4 min-w-[180px]">Nama Siswa</th>
                  <th className="py-3 px-3 min-w-[100px]">NISN</th>
                  {/* Dynamic Assignment Columns */}
                  {data.assignments.map((a) => (
                    <th
                      key={a._id}
                      className="py-3 px-3 min-w-[120px] text-center"
                      title={a.title}
                    >
                      <div className="line-clamp-1 font-bold text-foreground">
                        {a.title}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Maks {a.maxScore}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 min-w-[90px] text-center font-bold text-foreground">
                    Rata-rata
                  </th>
                  <th className="py-3 px-3 w-16 text-center">Predikat</th>
                  <th className="py-3 px-3 min-w-[90px] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.matrix.map((row, idx) => (
                  <tr
                    key={row.student._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {row.student.name}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                      {row.student.nisn || "-"}
                    </td>

                    {/* Dynamic Scores */}
                    {data.assignments.map((a) => (
                      <td
                        key={a._id}
                        className="py-3 px-3 text-center font-medium"
                      >
                        {getScoreBadge(row.scores[a._id], a.maxScore)}
                      </td>
                    ))}

                    {/* Average */}
                    <td className="py-3 px-3 text-center font-bold text-sm text-foreground font-mono">
                      {row.average > 0 ? row.average.toFixed(1) : "-"}
                    </td>

                    {/* Grade Letter */}
                    <td className="py-3 px-3 text-center">
                      {row.average > 0 ? getGradeBadge(row.gradeLetter) : "-"}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {row.status === "Tuntas" ? (
                        <Badge variant="green">Tuntas</Badge>
                      ) : row.status === "Remedial" ? (
                        <Badge variant="orange">Remedial</Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Belum Lengkap
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Submissions Section below */}
      {data && data.recentSubmissions && data.recentSubmissions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">
              Submisi Tugas Terbaru Yang Masuk
            </h3>
            <span className="text-xs text-muted-foreground">
              {data.recentSubmissions.length} pengumpulan terkini
            </span>
          </div>

          <div className="space-y-2">
            {data.recentSubmissions.map((sub) => (
              <div
                key={sub._id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {sub.studentId?.name?.charAt(0) || "S"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {sub.studentId?.name || "Siswa"}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Tugas: <strong>{sub.assignmentId?.title}</strong> •{" "}
                      {new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sub.status === "graded" ? (
                    <span className="font-bold text-emerald-600 font-mono">
                      {sub.score}/{sub.assignmentId?.maxScore}
                    </span>
                  ) : (
                    <Badge variant="blue">Perlu Dinilai</Badge>
                  )}

                  {sub.assignmentId?._id && (
                    <Link
                      href={`/guru/assignments/${sub.assignmentId._id}/submissions`}
                    >
                      <Button variant="outline" size="sm" className="text-xs">
                        Nilai Sekarang
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuruGradesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Memuat buku nilai...</div>}>
      <PenilaianContent />
    </Suspense>
  );
}
