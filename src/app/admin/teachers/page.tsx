"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  Users,
  GraduationCap,
  Edit2,
  Trash2,
  X,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface TeacherItem {
  _id: string;
  name: string;
  email: string;
  nip?: string;
  degree?: string;
  lastEducation?: string;
  subjects?: Array<{ _id: string; name: string; code: string }>;
  departmentId?: { _id: string; name: string; code: string };
  isHomeroomTeacher?: boolean;
  homeroomClassId?: { _id: string; name: string };
  joinDate?: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  code: string;
}

interface DeptOption {
  _id: string;
  name: string;
  code: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Applied Filters
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [sortAlphabet, setSortAlphabet] = useState("name");
  const [selectedJoinYear, setSelectedJoinYear] = useState("all");
  const [selectedJoinDate, setSelectedJoinDate] = useState<string | null>(null);

  // Drawer & Draft Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempSubject, setTempSubject] = useState("all");
  const [tempDepartment, setTempDepartment] = useState("all");
  const [tempSort, setTempSort] = useState("name");
  const [tempJoinYear, setTempJoinYear] = useState("all");
  const [tempJoinDate, setTempJoinDate] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date(2024, 1, 1)); // February 2024 default

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleOpenFilterDrawer() {
    setTempSubject(selectedSubject);
    setTempDepartment(selectedDepartment);
    setTempSort(sortAlphabet);
    setTempJoinYear(selectedJoinYear);
    setTempJoinDate(selectedJoinDate);
    setIsFilterModalOpen(true);
  }

  function handleApplyFilter() {
    setSelectedSubject(tempSubject);
    setSelectedDepartment(tempDepartment);
    setSortAlphabet(tempSort);
    setSelectedJoinYear(tempJoinYear);
    setSelectedJoinDate(tempJoinDate);
    setIsFilterModalOpen(false);
  }

  function handleResetFilter() {
    setTempSubject("all");
    setTempDepartment("all");
    setTempSort("name");
    setTempJoinYear("all");
    setTempJoinDate(null);

    setSelectedSubject("all");
    setSelectedDepartment("all");
    setSortAlphabet("name");
    setSelectedJoinYear("all");
    setSelectedJoinDate(null);
    setIsFilterModalOpen(false);
  }

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedSubject !== "all") params.set("subjectId", selectedSubject);
      if (selectedDepartment !== "all") params.set("departmentId", selectedDepartment);
      if (selectedJoinYear !== "all") params.set("joinYear", selectedJoinYear);
      if (sortAlphabet) params.set("sort", sortAlphabet);

      const [teacherRes, subjectRes, deptRes] = await Promise.all([
        fetch(`/api/admin/teachers?${params.toString()}`),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/departments"),
      ]);

      const [teacherJson, subjectJson, deptJson] = await Promise.all([
        teacherRes.json(),
        subjectRes.json(),
        deptRes.json(),
      ]);

      if (teacherJson.success) setTeachers(teacherJson.data);
      if (subjectJson.success) setSubjects(subjectJson.data);
      if (deptJson.success) setDepartments(deptJson.data);
    } catch (err) {
      console.error("Gagal memuat data guru:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedSubject, selectedDepartment, selectedJoinYear, sortAlphabet]);

  async function handleDeleteTeacher() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/teachers/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal menghapus data guru");
      } else {
        setDeleteTarget(null);
        loadData();
      }
    } catch {
      alert("Terjadi kesalahan sistem saat menghapus data guru");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header matching Figma Learnix */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Guru</h1>
          <p className="text-sm text-slate-500">
            Kelola data pendidik, profil, dan penugasan mata pelajaran seluruh guru di sistem.
          </p>
        </div>
        <Link
          href="/admin/teachers/new"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-xs"
        >
          <Plus className="size-4" />
          Tambah Guru
        </Link>
      </div>

      {/* Stats Cards matching Image 2 Top-Left */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">TOTAL GURU</div>
            <div className="text-2xl font-bold text-slate-800">{teachers.length}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">WALI KELAS AKTIF</div>
            <div className="text-2xl font-bold text-slate-800">
              {teachers.filter((t) => t.isHomeroomTeacher).length}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari guru berdasarkan nama atau NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenFilterDrawer}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Filter className="size-4 text-slate-500" />
            Filter Guru
          </button>
        </div>
      </div>

      {/* Teachers Table matching Image 2 Top-Left */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Nama Guru</th>
              <th className="py-3.5 px-6">NIP</th>
              <th className="py-3.5 px-6">Mata Pelajaran</th>
              <th className="py-3.5 px-6">Status / Wali Kelas</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat data guru...</span>
                </td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  Tidak ada guru yang sesuai dengan pencarian.
                </td>
              </tr>
            ) : (
              teachers.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {t.name}
                          {t.degree ? `, ${t.degree}` : ""}
                        </div>
                        <div className="text-xs text-slate-400">{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-700">
                    {t.nip || "-"}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {t.subjects && t.subjects.length > 0 ? (
                        t.subjects.map((s) => (
                          <span
                            key={s._id}
                            className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
                          >
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum diatur</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {t.isHomeroomTeacher && t.homeroomClassId ? (
                      <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        Wali {t.homeroomClassId.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Guru Pengajar</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Guru"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Filter Right Drawer matching Screenshot */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFilterModalOpen(false)}
          />

          {/* Right Sliding Drawer */}
          <div className="relative z-10 w-80 max-w-full bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Filter Guru</h3>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* 1. PILIH MAPEL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  PILIH MAPEL
                </label>
                <div className="relative">
                  <select
                    value={tempSubject}
                    onChange={(e) => setTempSubject(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 pr-10 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="all">Semua Mapel</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* 2. PILIH JURUSAN */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  PILIH JURUSAN
                </label>
                <div className="relative">
                  <select
                    value={tempDepartment}
                    onChange={(e) => setTempDepartment(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 pr-10 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="all">Semua Jurusan</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* 3. URUTKAN BERDASARKAN */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  URUTKAN BERDASARKAN
                </label>
                <div className="relative">
                  <select
                    value={tempSort}
                    onChange={(e) => setTempSort(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 pr-10 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="name">Alfabet</option>
                    <option value="nip">NIP</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* 4. TAHUN BERGABUNG */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    TAHUN BERGABUNG
                  </label>
                  {tempJoinYear !== "all" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempJoinYear("all");
                        setTempJoinDate(null);
                      }}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Reset Tahun
                    </button>
                  )}
                </div>

                {/* Calendar Card matching Screenshot */}
                <div className="rounded-lg border border-slate-300 bg-white p-3 shadow-xs">
                  {/* Calendar Top Bar */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                        )
                      }
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700">
                      {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                        )
                      }
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>

                  {/* Day Initials: M T W T F S S */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>M</span>
                    <span>T</span>
                    <span>W</span>
                    <span>T</span>
                    <span>F</span>
                    <span>S</span>
                    <span>S</span>
                  </div>

                  {/* Day Numbers Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {Array.from({
                      length: (new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() + 6) % 7,
                    }).map((_, i) => (
                      <span key={`empty-${i}`} />
                    ))}
                    {Array.from({
                      length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate(),
                    }).map((_, i) => {
                      const dayNum = i + 1;
                      const isSelected =
                        tempJoinYear === String(calendarDate.getFullYear()) &&
                        (tempJoinDate === null ||
                          tempJoinDate ===
                            `${calendarDate.getFullYear()}-${calendarDate.getMonth() + 1}-${dayNum}`);
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => {
                            setTempJoinYear(String(calendarDate.getFullYear()));
                            setTempJoinDate(
                              `${calendarDate.getFullYear()}-${calendarDate.getMonth() + 1}-${dayNum}`
                            );
                          }}
                          className={`size-7 mx-auto flex items-center justify-center rounded-md transition text-xs ${
                            isSelected
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "text-slate-700 hover:bg-slate-100"
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

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
              <button
                type="button"
                onClick={handleResetFilter}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilter}
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 px-4 text-xs font-semibold text-white transition shadow-xs text-center"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Hapus Data Guru?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus data guru <strong>{deleteTarget.name}</strong>? Akun login dan penugasan kelasnya akan dihapus.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                onClick={handleDeleteTeacher}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
