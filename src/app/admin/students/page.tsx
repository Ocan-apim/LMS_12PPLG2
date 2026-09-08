"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Upload,
  Users,
  ArrowRightLeft,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Badge,
  Spinner,
} from "@/components/ui";

interface StudentItem {
  _id: string;
  name: string;
  email: string;
  nisn: string;
  gender: "Laki-laki" | "Perempuan";
  birthPlace: string;
  birthDate?: string;
  grade: string;
  departmentId?: { _id: string; name: string; code: string };
  classId?: { _id: string; name: string; grade: string };
  academicYear: string;
}

interface ClassOption {
  _id: string;
  name: string;
  grade: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  // Move class modal
  const [moveModalStudent, setMoveModalStudent] = useState<StudentItem | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
      });
      if (selectedClass !== "all") params.set("classId", selectedClass);
      if (selectedGrade !== "all") params.set("grade", selectedGrade);

      const [studentRes, classRes] = await Promise.all([
        fetch(`/api/admin/students?${params.toString()}`),
        fetch("/api/admin/classes"),
      ]);

      const [studentJson, classJson] = await Promise.all([
        studentRes.json(),
        classRes.json(),
      ]);

      if (studentJson.success) {
        setStudents(studentJson.data);
        setPagination(studentJson.pagination);
      }
      if (classJson.success) {
        setClasses(classJson.data);
      }
    } catch (err) {
      console.error("Gagal memuat data siswa:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1);
  }, [search, selectedClass, selectedGrade]);

  async function handleMoveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!moveModalStudent || !targetClassId) return;

    setMoving(true);
    setMoveError("");
    try {
      const res = await fetch("/api/admin/students/move-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: [moveModalStudent._id],
          targetClassId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMoveError(json.message || "Gagal memindahkan siswa");
      } else {
        setMoveModalStudent(null);
        loadData(pagination.page);
      }
    } catch {
      setMoveError("Terjadi kesalahan sistem saat memindahkan kelas");
    } finally {
      setMoving(false);
    }
  }

  async function handleDeleteStudent() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/students/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal menghapus siswa");
      } else {
        setDeleteTarget(null);
        loadData(pagination.page);
      }
    } catch {
      alert("Terjadi kesalahan sistem saat menghapus siswa");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(d?: string) {
    if (!d) return "-";
    const dt = new Date(d);
    return dt.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header matching Figma Learnix */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400">Dashboard / Manajemen Siswa</div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Manajemen Siswa</h1>
          <p className="text-sm text-slate-500">
            Kelola data akademik, profil, dan status pembelajaran seluruh siswa.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students/import"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Upload className="size-4 text-slate-500" />
            Impor Data
          </Link>
          <Link
            href="/admin/students/new"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shadow-xs"
          >
            <Plus className="size-4" />
            Tambah Siswa
          </Link>
        </div>
      </div>

      {/* Stats Card matching Image 1 Bottom-Left */}
      <div className="w-full sm:w-72 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          TOTAL SISWA
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-slate-900">{pagination.total}</span>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="size-3" /> +12 Bulan ini
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NISN (10 digit)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grade filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">Semua Tingkat</option>
            <option value="10">Kelas 10</option>
            <option value="11">Kelas 11</option>
            <option value="12">Kelas 12</option>
          </select>

          {/* Class filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">Filter Kelas (Rombel)</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table matching Image 1 Bottom-Left */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Nama Siswa</th>
              <th className="py-3.5 px-6">NISN</th>
              <th className="py-3.5 px-6">Jenis Kelamin</th>
              <th className="py-3.5 px-6">Tempat Lahir</th>
              <th className="py-3.5 px-6">Tanggal Lahir</th>
              <th className="py-3.5 px-6">Kelas</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat daftar siswa...</span>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  Tidak ada data siswa yang ditemukan.
                </td>
              </tr>
            ) : (
              students.map((st) => (
                <tr key={st._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {st.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{st.name}</div>
                        <div className="text-xs text-slate-400">{st.classId?.name || "Tanpa Kelas"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-700">{st.nisn}</td>
                  <td className="py-4 px-6 text-slate-600">{st.gender}</td>
                  <td className="py-4 px-6 text-slate-600">{st.birthPlace || "-"}</td>
                  <td className="py-4 px-6 text-slate-600">{formatDate(st.birthDate)}</td>
                  <td className="py-4 px-6">
                    {st.classId ? (
                      <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        {st.classId.name}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        Belum Diatur
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setMoveModalStudent(st);
                          setTargetClassId(st.classId?._id || "");
                          setMoveError("");
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Pindahkan Kelas Siswa"
                      >
                        <ArrowRightLeft className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(st)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Siswa"
                      >
                        <Trash2 className="size-4 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            <span>
              Menampilkan {students.length} dari {pagination.total} siswa
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Move Class Modal */}
      {moveModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <ArrowRightLeft className="size-5 text-blue-600" />
                <span>Pindahkan Kelas Siswa</span>
              </div>
              <button onClick={() => setMoveModalStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleMoveClass} className="mt-4 space-y-4">
              {moveError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{moveError}</span>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="text-slate-400">Siswa:</div>
                <div className="font-bold text-slate-800 text-sm">{moveModalStudent.name}</div>
                <div className="text-slate-500">NISN: {moveModalStudent.nisn} • Kelas Saat Ini: {moveModalStudent.classId?.name || "Belum Ada"}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Kelas Rombel Tujuan
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} (Tingkat {c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setMoveModalStudent(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={moving} className="bg-blue-600 text-white hover:bg-blue-700">
                  {moving ? "Memindahkan..." : "Pindahkan Sekarang"}
                </Button>
              </div>
            </form>
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
            <h3 className="mt-4 font-bold text-slate-900">Hapus Data Siswa?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus data siswa <strong>{deleteTarget.name}</strong> (NISN: {deleteTarget.nisn})?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                onClick={handleDeleteStudent}
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
