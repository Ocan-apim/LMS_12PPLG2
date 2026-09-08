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
  isHomeroomTeacher?: boolean;
  homeroomClassId?: { _id: string; name: string };
  joinDate?: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  code: string;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortAlphabet, setSortAlphabet] = useState("name");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedSubject !== "all") params.set("subjectId", selectedSubject);
      if (sortAlphabet) params.set("sort", sortAlphabet);

      const [teacherRes, subjectRes] = await Promise.all([
        fetch(`/api/admin/teachers?${params.toString()}`),
        fetch("/api/admin/subjects"),
      ]);

      const [teacherJson, subjectJson] = await Promise.all([
        teacherRes.json(),
        subjectRes.json(),
      ]);

      if (teacherJson.success) setTeachers(teacherJson.data);
      if (subjectJson.success) setSubjects(subjectJson.data);
    } catch (err) {
      console.error("Gagal memuat data guru:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedSubject, sortAlphabet]);

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
            onClick={() => setIsFilterModalOpen(true)}
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

      {/* Filter Modal matching Image 3 Top */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Filter Guru</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PILIH MAPEL
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="all">Semua Mata Pelajaran</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URUTKAN BERDASARKAN
                </label>
                <select
                  value={sortAlphabet}
                  onChange={(e) => setSortAlphabet(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="name">Alfabet (A - Z)</option>
                  <option value="nip">Nomor Induk Pegawai (NIP)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSubject("all");
                    setSortAlphabet("name");
                    setIsFilterModalOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Terapkan Filter
                </Button>
              </div>
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
