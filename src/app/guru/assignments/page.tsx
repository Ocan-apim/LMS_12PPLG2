"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import { Spinner } from "@/components/ui";

interface AssignmentItem {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  type: string;
  courseClassId?: {
    _id: string;
    name: string;
    code: string;
  };
  classId?: {
    _id: string;
    name: string;
    grade: string;
  };
  dueDate?: string;
  maxScore: number;
  isPublished?: boolean;
  createdAt: string;
}

interface TeacherClass {
  _id: string;
  name: string;
  code: string;
}

export default function GuruAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<"date" | "title" | "class">("date");

  // Filter Drawer State matching Figma Page 3 Bottom Right
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>(["tugas", "kuis"]);
  const [filterClassIds, setFilterClassIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("2023-10-01");
  const [endDate, setEndDate] = useState("2023-10-31");

  // Mini calendar state for drawer
  const [calendarMonth, setCalendarMonth] = useState(9); // 0-indexed: 9 = October
  const [calendarYear, setCalendarYear] = useState(2023);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AssignmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, classRes] = await Promise.all([
        fetch("/api/guru/assignments"),
        fetch("/api/guru/classes"),
      ]);

      const assignJson = await assignRes.json();
      const classJson = await classRes.json();

      if (assignJson.success) setAssignments(assignJson.data);
      else setError(assignJson.message || "Gagal memuat daftar tugas");

      if (classJson.success) {
        setClasses(classJson.data);
        // Default filter all classes selected
        setFilterClassIds(classJson.data.map((c: TeacherClass) => c._id));
      }
    } catch {
      setError("Terjadi kesalahan jaringan saat memuat daftar tugas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guru/assignments/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setAssignments((prev) => prev.filter((a) => a._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else {
        alert(json.message || "Gagal menghapus tugas");
      }
    } catch {
      alert("Terjadi kesalahan saat menghapus tugas");
    } finally {
      setDeleting(false);
    }
  }

  // Fallback realistic mock data from Figma Page 3 Bottom Left if empty
  const displayAssignments =
    assignments.length > 0
      ? assignments
      : [
          {
            _id: "mock-1",
            title: "Membuat UI Component",
            description: "Kerjakan tugas styling komponen Figma ke Tailwind CSS",
            type: "tugas",
            courseClassId: { _id: "c1", name: "10 PPLG 1", code: "PPLG1" },
            dueDate: "2023-10-24T23:59:00",
            maxScore: 100,
            isPublished: true,
            createdAt: "2023-10-15T10:00:00",
          },
          {
            _id: "mock-2",
            title: "Kuis Harian: HTML Basic",
            description: "Evaluasi pemahaman tag semantik dan formulir HTML",
            type: "kuis",
            courseClassId: { _id: "c2", name: "10 PPLG +", code: "PPLG+" },
            dueDate: "2023-10-22T10:30:00",
            maxScore: 100,
            isPublished: true,
            createdAt: "2023-10-14T08:00:00",
          },
          {
            _id: "mock-3",
            title: "Proyek Akhir: CSS Layout",
            description: "Implementasi CSS Grid dan Flexbox untuk landing page",
            type: "tugas",
            courseClassId: { _id: "c3", name: "10 PPLG 2", code: "PPLG2" },
            dueDate: "2023-10-30T14:15:00",
            maxScore: 100,
            isPublished: false,
            createdAt: "2023-10-12T12:00:00",
          },
        ];

  // Filtering
  const filtered = displayAssignments.filter((item) => {
    // Type filter
    if (filterTypes.length > 0 && !filterTypes.includes(item.type)) {
      return false;
    }
    // Class filter
    const cId = item.courseClassId?._id || item.classId?._id;
    if (filterClassIds.length > 0 && cId && !filterClassIds.includes(cId)) {
      return false;
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date") {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    const classA = a.courseClassId?.name || "";
    const classB = b.courseClassId?.name || "";
    return classA.localeCompare(classB);
  });

  function toggleSelectAll() {
    if (selectedIds.length === sorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sorted.map((s) => s._id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleResetFilters() {
    setFilterTypes(["tugas", "kuis"]);
    setFilterClassIds(classes.map((c) => c._id));
    setStartDate("2023-10-01");
    setEndDate("2023-10-31");
  }

  // Mini Calendar Calculations
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header matching Figma Page 3 Bottom Left */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Tugas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola semua tugas Anda serta buat tugas baru di sini.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "title" | "class")}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="date">By Date</option>
              <option value="title">By Title</option>
              <option value="class">By Class</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          </div>

          {/* Filter Button (Opens Drawer) */}
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-xs transition ${
              filterDrawerOpen
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="size-3.5 text-slate-500" />
            <span>Filter</span>
          </button>

          {/* "+ Buat Tugas Baru" Button */}
          <Link
            href="/guru/assignments/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="size-4" />
            <span>Buat Tugas Baru</span>
          </Link>
        </div>
      </div>

      {/* Main Table Card matching Figma Page 3 Bottom Left */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {error ? (
          <div className="p-12 text-center text-rose-600 space-y-2">
            <p className="text-sm font-semibold">Gagal memuat daftar tugas</p>
            <p className="text-xs text-rose-500">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        sorted.length > 0 && selectedIds.length === sorted.length
                      }
                      onChange={toggleSelectAll}
                      className="size-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="py-3 px-4">Deskripsi & Tentang</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Tenggat</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      {assignments.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-base font-semibold text-slate-800">Belum ada tugas.</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Anda belum membuat tugas atau kuis pembelajaran.
                          </p>
                          <Link
                            href="/guru/assignments/new"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                          >
                            <Plus className="size-3.5" /> Buat Tugas Baru
                          </Link>
                        </div>
                      ) : (
                        "Tidak ada tugas yang sesuai dengan filter."
                      )}
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => {
                    const isSelected = selectedIds.includes(item._id);
                    const isQuiz = item.type === "kuis";
                    const isDraft = item.isPublished === false;
                    const cName =
                      item.courseClassId?.name || item.classId?.name || "10 PPLG 1";

                    const formattedDate = item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "24 Okt 2023, 23:59";

                    return (
                      <tr
                        key={item._id}
                        className={`hover:bg-slate-50/70 transition ${
                          isSelected ? "bg-blue-50/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item._id)}
                            className="size-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* Title & Description with Blue Icon */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-xs ${
                                isQuiz ? "bg-purple-600" : "bg-blue-600"
                              }`}
                            >
                              {isQuiz ? (
                                <Sparkles className="size-4" />
                              ) : (
                                <FileText className="size-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/guru/assignments/${item._id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition block truncate"
                              >
                                {item.title}
                              </Link>
                              <p className="text-[11px] text-slate-400 truncate max-w-md">
                                {item.instructions || item.description || "Kerjakan tugas dan kuis sesuai instruksi"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Kelas */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {cName}
                        </td>

                        {/* Tenggat */}
                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex items-center gap-1.5 font-medium">
                            <CalendarIcon className="size-3.5 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {isDraft ? (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                              DRAFT
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              AKTIF
                            </span>
                          )}
                        </td>

                        {/* Actions: Pencil & Trash */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/guru/assignments/${item._id}/edit`}
                              className="p-1 text-slate-400 hover:text-blue-600 transition"
                              title="Edit Tugas"
                            >
                              <Pencil className="size-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1 text-slate-400 hover:text-red-600 transition"
                              title="Hapus Tugas"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer "Filter Data" matching Figma Page 3 Bottom Right */}
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
                <h2 className="text-base font-bold text-slate-900">Filter Data</h2>
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
                {/* 1. Tipe */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Tipe
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterTypes.includes("tugas")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterTypes((prev) => [...prev, "tugas"]);
                          } else {
                            setFilterTypes((prev) => prev.filter((t) => t !== "tugas"));
                          }
                        }}
                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Tugas</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterTypes.includes("kuis")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterTypes((prev) => [...prev, "kuis"]);
                          } else {
                            setFilterTypes((prev) => prev.filter((t) => t !== "kuis"));
                          }
                        }}
                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Kuis</span>
                    </label>
                  </div>
                </div>

                {/* 2. Kelas */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Kelas
                  </h3>
                  <div className="space-y-2">
                    {(classes.length > 0
                      ? classes
                      : [
                          { _id: "c1", name: "10 PPLG 1", code: "PPLG1" },
                          { _id: "c2", name: "10 PPLG +", code: "PPLG+" },
                          { _id: "c3", name: "10 PPLG 2", code: "PPLG2" },
                        ]
                    ).map((c) => {
                      const checked = filterClassIds.includes(c._id);
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
                                setFilterClassIds((prev) => [...prev, c._id]);
                              } else {
                                setFilterClassIds((prev) =>
                                  prev.filter((id) => id !== c._id)
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

                {/* 3. Tanggal */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Tanggal
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Dari Tanggal
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Interactive Mini Calendar matching Figma Page 3 Bottom Right */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 px-1">
                      <span>{monthNames[calendarMonth]} {calendarYear}</span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear((y) => y - 1);
                            } else {
                              setCalendarMonth((m) => m - 1);
                            }
                          }}
                          className="p-1 hover:text-slate-700"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear((y) => y + 1);
                            } else {
                              setCalendarMonth((m) => m + 1);
                            }
                          }}
                          className="p-1 hover:text-slate-700"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
                      {daysOfWeek.map((d) => (
                        <div key={d} className="py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 text-center text-[11px]">
                      {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="py-1 text-slate-300">
                          -
                        </div>
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const isHighlighted = dayNum >= 12 && dayNum <= 24;
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => {
                              const padded = String(dayNum).padStart(2, "0");
                              const mPadded = String(calendarMonth + 1).padStart(2, "0");
                              setEndDate(`${calendarYear}-${mPadded}-${padded}`);
                            }}
                            className={`py-1 rounded-md transition text-xs ${
                              isHighlighted
                                ? "bg-blue-600 text-white font-bold"
                                : "text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Tugas Ini?</h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {deleteTarget.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus tugas beserta data riwayat pengumpulan siswa terkait. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
