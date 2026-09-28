"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  BarChart3,
  PieChart,
  Clock,
  X,
  Star,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Spinner } from "@/components/ui";

interface TeacherClassOption {
  _id: string;
  name: string;
  code: string;
  classRombelId?: {
    name: string;
    grade: string;
  };
}

interface RecentSubmissionItem {
  _id: string;
  studentName: string;
  studentClass: string;
  assignmentTitle: string;
  assignmentType: string;
  assignmentId: string;
  submittedDate: string;
  status: "graded" | "needs_review" | "late" | "pending";
  score?: number;
  maxScore?: number;
}

interface TopPerformer {
  rank: number;
  name: string;
  score: number;
}

function PenilaianContent() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("courseClassId") || "";

  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report Controls matching Figma Page 4 Left
  const [generateReport, setGenerateReport] = useState(false);
  const [selectedWalas, setSelectedWalas] = useState("-");
  const [selectedJurusan, setSelectedJurusan] = useState("PPLG");

  // Slide-over Filter Drawer matching Figma Page 4 Right
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(["graded"]);
  const [minScore, setMinScore] = useState<number | string>(0);
  const [maxScore, setMaxScore] = useState<number | string>(100);
  const [filterClassIds, setFilterClassIds] = useState<string[]>(["all"]);

  // Submissions list
  const [submissions, setSubmissions] = useState<RecentSubmissionItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;

  // Quick grading modal
  const [gradingModalItem, setGradingModalItem] = useState<RecentSubmissionItem | null>(null);
  const [modalScore, setModalScore] = useState<string>("");
  const [modalFeedback, setModalFeedback] = useState<string>("");
  const [submittingGrade, setSubmittingGrade] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const query = selectedClassId ? `?courseClassId=${selectedClassId}` : "";
        const [gradesRes, classesRes] = await Promise.all([
          fetch(`/api/guru/grades${query}`),
          fetch("/api/guru/classes"),
        ]);

        const gradesJson = await gradesRes.json();
        const classesJson = await classesRes.json();

        if (classesJson.success && Array.isArray(classesJson.data)) {
          setClasses(classesJson.data);
          if (!selectedClassId && classesJson.data.length > 0) {
            setSelectedClassId(classesJson.data[0]._id);
          }
        }

        if (gradesJson.success && gradesJson.data?.recentSubmissions) {
          const mapped: RecentSubmissionItem[] = gradesJson.data.recentSubmissions.map(
            (s: any, idx: number) => ({
              _id: s._id || `sub-${idx}`,
              studentName: s.studentId?.name || "Siswa",
              studentClass: gradesJson.data.selectedClass?.name || "Kelas",
              assignmentTitle: s.assignmentId?.title || "Tugas",
              assignmentType: "Tugas",
              assignmentId: s.assignmentId?._id || "",
              submittedDate: s.submittedAt
                ? new Date(s.submittedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-",
              status: s.status === "graded" ? "graded" : s.status === "late" ? "late" : s.status === "turned_in" ? "needs_review" : "pending",
              score: s.score,
              maxScore: s.assignmentId?.maxScore || 100,
            })
          );
          setSubmissions(mapped);
        } else if (!gradesJson.success) {
          setError(gradesJson.message || "Gagal memuat data penilaian");
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        console.error("Gagal memuat data penilaian:", err);
        setError("Terjadi kesalahan jaringan saat memuat data penilaian");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedClassId]);

  function handleExportExcel() {
    if (!selectedClassId) return;
    window.open(`/api/guru/grades/export?courseClassId=${selectedClassId}`, "_blank");
  }

  function openGradingModal(row: RecentSubmissionItem) {
    setGradingModalItem(row);
    setModalScore(typeof row.score === "number" ? String(row.score) : "");
    setModalFeedback("");
  }

  async function handleSaveQuickGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!gradingModalItem) return;
    const num = parseFloat(modalScore);
    const max = gradingModalItem.maxScore || 100;
    if (isNaN(num) || num < 0 || num > max) {
      alert(`Nilai harus di antara 0 dan ${max}`);
      return;
    }

    setSubmittingGrade(true);
    try {
      if (!gradingModalItem._id.startsWith("m-")) {
        await fetch(`/api/guru/submissions/${gradingModalItem._id}/grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: num,
            feedback: modalFeedback,
          }),
        });
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s._id === gradingModalItem._id
            ? { ...s, score: num, status: "graded" }
            : s
        )
      );
      setGradingModalItem(null);
    } catch {
      alert("Terjadi kesalahan saat menyimpan nilai");
    } finally {
      setSubmittingGrade(false);
    }
  }

  // Submissions list
  const rawSubmissions: RecentSubmissionItem[] = submissions;

  // Apply active drawer filters
  const displaySubmissions: RecentSubmissionItem[] = rawSubmissions.filter((row) => {
    if (filterStatuses.length > 0) {
      const match = filterStatuses.some((st) => {
        if (st === "graded") return row.status === "graded";
        if (st === "needs_review") return row.status === "needs_review" || row.status === "pending";
        if (st === "late") return row.status === "late";
        return true;
      });
      if (!match) return false;
    }

    if (row.status === "graded" && typeof row.score === "number") {
      const min = typeof minScore === "number" ? minScore : parseFloat(minScore) || 0;
      const max = typeof maxScore === "number" ? maxScore : parseFloat(maxScore) || 100;
      if (row.score < min || row.score > max) return false;
    }

    return true;
  });

  // Dynamically compute statistics reflecting active filter/view
  const gradedItems = displaySubmissions.filter(
    (s) => typeof s.score === "number" && s.status === "graded"
  );
  const computedAverage =
    gradedItems.length > 0
      ? (
          gradedItems.reduce((acc, curr) => acc + (curr.score || 0), 0) /
          gradedItems.length
        ).toFixed(1)
      : "-";

  const topPerformers: TopPerformer[] = [...gradedItems]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)
    .map((item, idx) => ({
      rank: idx + 1,
      name: item.studentName,
      score: item.score || 0,
    }));

  const totalGradedCount = gradedItems.length || 1;
  const distCounts = {
    c1: gradedItems.filter((s) => (s.score || 0) < 60).length,
    c2: gradedItems.filter((s) => (s.score || 0) >= 60 && (s.score || 0) <= 70).length,
    c3: gradedItems.filter((s) => (s.score || 0) > 70 && (s.score || 0) <= 80).length,
    c4: gradedItems.filter((s) => (s.score || 0) > 80 && (s.score || 0) <= 90).length,
    c5: gradedItems.filter((s) => (s.score || 0) > 90).length,
  };
  const distributionCols = [
    {
      label: "<60",
      count:
        gradedItems.length > 0
          ? `${Math.round((distCounts.c1 / totalGradedCount) * 100)}%`
          : "0%",
      height: distCounts.c1 > 0 ? "h-6" : "h-1",
    },
    {
      label: "60-70",
      count:
        gradedItems.length > 0
          ? `${Math.round((distCounts.c2 / totalGradedCount) * 100)}%`
          : "0%",
      height: distCounts.c2 > 0 ? "h-12" : "h-1",
    },
    {
      label: "71-80",
      count:
        gradedItems.length > 0
          ? `${Math.round((distCounts.c3 / totalGradedCount) * 100)}%`
          : "0%",
      height: distCounts.c3 > 0 ? "h-20" : "h-1",
    },
    {
      label: "81-90",
      count:
        gradedItems.length > 0
          ? `${Math.round((distCounts.c4 / totalGradedCount) * 100)}%`
          : "0%",
      height: distCounts.c4 > 0 ? "h-24" : "h-1",
    },
    {
      label: "91-100",
      count:
        gradedItems.length > 0
          ? `${Math.round((distCounts.c5 / totalGradedCount) * 100)}%`
          : "0%",
      height: distCounts.c5 > 0 ? "h-14" : "h-1",
    },
  ];

  const totalSubs = displaySubmissions.length || 1;
  const onTimeCount = displaySubmissions.filter((s) => s.status === "graded").length;
  const lateCount = displaySubmissions.filter((s) => s.status === "late").length;

  const onTimePct =
    displaySubmissions.length > 0 ? Math.round((onTimeCount / totalSubs) * 100) : 0;
  const latePct =
    displaySubmissions.length > 0 ? Math.round((lateCount / totalSubs) * 100) : 0;
  const missingPct =
    displaySubmissions.length > 0 ? Math.max(0, 100 - onTimePct - latePct) : 0;

  function handleResetFilters() {
    setFilterStatuses([]);
    setMinScore(0);
    setMaxScore(100);
    setFilterClassIds(["all"]);
  }

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Top Header matching Figma Page 4 Left */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Penilaian</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            You have {displaySubmissions.filter((s) => s.status !== "graded").length} pending submissions across {classes.length} active classes.
          </p>
        </div>

        {/* Class Average Badge matching Figma Page 4 Left */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Star className="size-4 fill-emerald-600" />
          </div>
          <div>
            <div className="text-base font-extrabold text-slate-900 leading-none">
              {computedAverage}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Class Average
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* If no classes at all */}
      {classes.length === 0 && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-600">Belum ada kelas.</p>
        </div>
      )}

      {/* Card 1: Generate Academic Report matching Figma Page 4 Left */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={generateReport}
            onChange={(e) => setGenerateReport(e.target.checked)}
            className="size-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Generate Academic Report</span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* KELAS */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Kelas
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                {classes.length === 0 ? (
                  <option value="">Belum ada kelas.</option>
                ) : (
                  classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* WALAS */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Walas
              </label>
              <select
                value={selectedWalas}
                onChange={(e) => setSelectedWalas(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="-">-</option>
                <option value="Ibu Alvisya">Ibu Alvisya</option>
                <option value="Pak Bambang">Pak Bambang</option>
              </select>
            </div>

            {/* JURUSAN */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Jurusan
              </label>
              <select
                value={selectedJurusan}
                onChange={(e) => setSelectedJurusan(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="PPLG">PPLG</option>
                <option value="TJKT">TJKT</option>
                <option value="DKV">DKV</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <SlidersHorizontal className="size-3.5 text-slate-500" />
              <span>Filter</span>
            </button>

            {/* Download Excel (.xlsx) Green Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet className="size-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Recent Submissions Table matching Figma Page 4 Left */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Recent Submissions</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySubmissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-xs font-medium text-slate-500"
                    >
                      {classes.length === 0
                        ? "Belum ada kelas."
                        : "Belum ada pengumpulan tugas."}
                    </td>
                  </tr>
                ) : (
                  displaySubmissions.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/70 transition">
                    {/* Student Name with Circle Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                          {row.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{row.studentName}</p>
                          <p className="text-[10px] text-slate-400">{row.studentClass}</p>
                        </div>
                      </div>
                    </td>

                    {/* Assignment */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {row.assignmentTitle}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {row.submittedDate}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {row.status === "graded" ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Graded
                        </span>
                      ) : row.status === "needs_review" ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Needs Review
                        </span>
                      ) : row.status === "late" ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                          Late
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-center">
                      {row.status === "needs_review" ? (
                        <button
                          type="button"
                          onClick={() => openGradingModal(row)}
                          className="inline-flex items-center rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                        >
                          Grade Now
                        </button>
                      ) : row.status === "graded" ? (
                        <button
                          type="button"
                          onClick={() => openGradingModal(row)}
                          className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                        >
                          Edit Grade
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openGradingModal(row)}
                          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>

            {/* Pagination matching Figma Page 4 Left */}
            {displaySubmissions.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
                <span>Showing 1 to {displaySubmissions.length} of {displaySubmissions.length} submissions</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1 text-slate-600">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom 3 Cards Row matching Figma Page 4 Left */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1: TOP PERFORMERS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Top Performers
            </h3>
            <Award className="size-4 text-amber-500" />
          </div>

          <div className="space-y-3">
            {topPerformers.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Belum ada data nilai.
              </p>
            ) : (
              topPerformers.map((st) => (
                <div
                  key={st.rank}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-400 w-3">{st.rank}.</span>
                    <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
                      {st.name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-800">{st.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {st.score}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: GRADE DISTRIBUTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Grade Distribution
            </h3>
            <BarChart3 className="size-4 text-blue-600" />
          </div>

          {/* Simple Clean Bar Chart Representation */}
          {gradedItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              Belum ada data distribusi nilai.
            </p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-28 pt-2">
              {distributionCols.map((col) => (
                <div
                  key={col.label}
                  className="flex flex-col items-center flex-1 gap-1"
                >
                  <div className="w-full bg-slate-100 rounded-t-md flex items-end justify-center h-20">
                    <div
                      className={`w-full bg-blue-600 rounded-t-md ${col.height} transition-all`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {col.label}
                  </span>
                  <span className="text-[9px] font-bold text-slate-600 font-mono">
                    {col.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: SUBMISSION STATS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Submission Stats
            </h3>
            <PieChart className="size-4 text-emerald-600" />
          </div>

          {displaySubmissions.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              Belum ada data pengumpulan tugas.
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">On-time</span>
                <span className="font-bold text-slate-900 font-mono">{onTimePct}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${onTimePct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Late</span>
                <span className="font-bold text-slate-900 font-mono">{latePct}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${latePct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Missing / Pending</span>
                <span className="font-bold text-slate-900 font-mono">{missingPct}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${missingPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Grade Modal */}
      {gradingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Penilaian: {gradingModalItem.studentName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {gradingModalItem.studentClass} • {gradingModalItem.assignmentTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGradingModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickGrade} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nilai (Skor)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Maks {gradingModalItem.maxScore || 100}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={gradingModalItem.maxScore || 100}
                  step="any"
                  value={modalScore}
                  onChange={(e) => setModalScore(e.target.value)}
                  placeholder="Masukkan nilai (contoh: 85)"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Feedback Guru (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={modalFeedback}
                  onChange={(e) => setModalFeedback(e.target.value)}
                  placeholder="Tuliskan masukan untuk siswa..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Link
                  href={`/guru/assignments/${gradingModalItem.assignmentId || "mock"}/submissions`}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Buka Detail Submisi →
                </Link>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGradingModalItem(null)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGrade}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingGrade ? "Menyimpan..." : "Simpan Nilai"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer "Filter Penilaian" matching Figma Page 4 Right */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setFilterDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <h2 className="text-base font-bold text-slate-900">
                  Filter Penilaian
                </h2>
                <button
                  type="button"
                  onClick={() => setFilterDrawerOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* 1. Status Penilaian */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Status Penilaian
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterStatuses.includes("graded")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStatuses((prev) => [...prev, "graded"]);
                          } else {
                            setFilterStatuses((prev) =>
                              prev.filter((s) => s !== "graded")
                            );
                          }
                        }}
                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Dinilai</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterStatuses.includes("pending")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStatuses((prev) => [...prev, "pending"]);
                          } else {
                            setFilterStatuses((prev) =>
                              prev.filter((s) => s !== "pending")
                            );
                          }
                        }}
                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Belum Dinilai</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterStatuses.includes("late")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStatuses((prev) => [...prev, "late"]);
                          } else {
                            setFilterStatuses((prev) =>
                              prev.filter((s) => s !== "late")
                            );
                          }
                        }}
                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Terlambat</span>
                    </label>
                  </div>
                </div>

                {/* 2. Rentang Nilai */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rentang Nilai
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Min
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => setMinScore(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Kelas */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Kelas
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterClassIds.includes("all")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterClassIds(["all"]);
                          } else {
                            setFilterClassIds([]);
                          }
                        }}
                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Semua Kelas</span>
                    </label>

                    {(classes.length > 0
                      ? classes
                      : [
                          { _id: "c1", name: "10 PPLG 1", code: "PPLG1" },
                          { _id: "c2", name: "10 PPLG +", code: "PPLG+" },
                          { _id: "c3", name: "10 PPLG 2", code: "PPLG2" },
                        ]
                    ).map((c) => {
                      const checked =
                        filterClassIds.includes("all") ||
                        filterClassIds.includes(c._id);
                      return (
                        <label
                          key={c._id}
                          className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterClassIds((prev) => [
                                  ...prev.filter((id) => id !== "all"),
                                  c._id,
                                ]);
                              } else {
                                setFilterClassIds((prev) =>
                                  prev.filter((id) => id !== c._id && id !== "all")
                                );
                              }
                            }}
                            className="size-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Buttons */}
              <div className="border-t border-slate-100 p-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDrawerOpen(false)}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition text-center"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuruGradesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Memuat halaman penilaian...
        </div>
      }
    >
      <PenilaianContent />
    </Suspense>
  );
}
