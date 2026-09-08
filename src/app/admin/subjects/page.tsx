"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Layers,
} from "lucide-react";
import { Button, Spinner, Badge } from "@/components/ui";

interface SubjectItem {
  _id: string;
  name: string;
  code: string;
  category: "Umum" | "Kejuruan";
  grade: string;
  departmentId?: { _id: string; name: string; code: string };
  teacherIds?: Array<{ _id: string; name: string; degree?: string }>;
  description?: string;
}

interface DeptOption {
  _id: string;
  name: string;
  code: string;
}

interface TeacherOption {
  _id: string;
  name: string;
  degree?: string;
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "Umum" as "Umum" | "Kejuruan",
    departmentId: "",
    grade: "Semua",
    teacherIds: [] as string[],
    description: "",
  });

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<SubjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedDept !== "all") params.set("departmentId", selectedDept);

      const [subRes, deptRes, teacherRes] = await Promise.all([
        fetch(`/api/admin/subjects?${params.toString()}`),
        fetch("/api/admin/departments"),
        fetch("/api/admin/teachers"),
      ]);

      const [subJson, deptJson, teacherJson] = await Promise.all([
        subRes.json(),
        deptRes.json(),
        teacherRes.json(),
      ]);

      if (subJson.success) setSubjects(subJson.data);
      if (deptJson.success) setDepartments(deptJson.data);
      if (teacherJson.success) setTeachers(teacherJson.data);
    } catch (err) {
      console.error("Gagal memuat mata pelajaran:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedDept]);

  function handleOpenCreate() {
    setEditingSubject(null);
    setFormData({
      name: "",
      code: "",
      category: "Umum",
      departmentId: "",
      grade: "Semua",
      teacherIds: [],
      description: "",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(s: SubjectItem) {
    setEditingSubject(s);
    setFormData({
      name: s.name,
      code: s.code,
      category: s.category,
      departmentId: s.departmentId?._id || "",
      grade: s.grade || "Semua",
      teacherIds: s.teacherIds ? s.teacherIds.map((t) => t._id) : [],
      description: s.description || "",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError("Nama dan kode mata pelajaran wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingSubject
        ? `/api/admin/subjects/${editingSubject._id}`
        : "/api/admin/subjects";
      const method = editingSubject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.message || "Gagal menyimpan mata pelajaran");
      } else {
        setIsModalOpen(false);
        loadData();
      }
    } catch {
      setFormError("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/subjects/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal menghapus mata pelajaran");
      } else {
        setDeleteTarget(null);
        loadData();
      }
    } catch {
      alert("Terjadi kesalahan sistem saat menghapus");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mata Pelajaran</h1>
          <p className="text-sm text-slate-500">
            Kelola mata pelajaran umum dan muatan kejuruan SMK beserta guru pengampu.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          leftIcon={<Plus className="size-4" />}
        >
          Tambah Mapel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BookOpen className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">TOTAL MAPEL</div>
            <div className="text-2xl font-bold text-slate-800">{subjects.length}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Layers className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">MAPEL KEJURUAN</div>
            <div className="text-2xl font-bold text-slate-800">
              {subjects.filter((s) => s.category === "Kejuruan").length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BookOpen className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">MAPEL UMUM</div>
            <div className="text-2xl font-bold text-slate-800">
              {subjects.filter((s) => s.category === "Umum").length}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari mata pelajaran atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">Semua Kategori</option>
            <option value="Umum">Umum</option>
            <option value="Kejuruan">Kejuruan</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="all">Semua Jurusan</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Kode</th>
              <th className="py-3.5 px-6">Nama Mata Pelajaran</th>
              <th className="py-3.5 px-6">Kategori / Jurusan</th>
              <th className="py-3.5 px-6">Guru Pengampu</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat mata pelajaran...</span>
                </td>
              </tr>
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  Tidak ada mata pelajaran yang ditemukan.
                </td>
              </tr>
            ) : (
              subjects.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-mono font-bold text-xs text-blue-700">
                    <span className="rounded-md bg-blue-50 px-2 py-1 border border-blue-200">
                      {s.code}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    {s.description && (
                      <div className="text-xs text-slate-400 line-clamp-1">{s.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          s.category === "Kejuruan"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {s.category}
                      </span>
                      {s.departmentId && (
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                          {s.departmentId.code}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {s.teacherIds && s.teacherIds.length > 0 ? (
                        s.teacherIds.map((t) => (
                          <span
                            key={t._id}
                            className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {t.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada pengampu</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Mapel"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Mapel"
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

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  {editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Pemrograman Web & Perangkat Bergerak"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: PWEB"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Mapel
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as "Umum" | "Kejuruan" })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Umum">Umum (Muatan Nasional / Kewilayahan)</option>
                    <option value="Kejuruan">Kejuruan (C2 / C3 Keahlian)</option>
                  </select>
                </div>
              </div>

              {formData.category === "Kejuruan" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jurusan Terkait
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">-- Pilih Jurusan Kejuruan --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Mapel
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat kompetensi dasar..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                  {submitting ? "Menyimpan..." : "Simpan Mapel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Hapus Mata Pelajaran?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name} ({deleteTarget.code})</strong>?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                onClick={handleDelete}
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
