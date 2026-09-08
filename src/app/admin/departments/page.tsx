"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface DepartmentItem {
  _id: string;
  name: string;
  code: string;
  maxClasses: number;
  capacity: number;
  description?: string;
  classCount?: number;
  studentCount?: number;
  headOfDepartmentId?: { _id: string; name: string; email: string };
}

interface TeacherOption {
  _id: string;
  name: string;
  degree?: string;
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    maxClasses: 2,
    capacity: 72,
    headOfDepartmentId: "",
    description: "",
  });

  // Type-to-confirm Delete modal matching Image 3 Bottom-Right
  const [deleteTarget, setDeleteTarget] = useState<DepartmentItem | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [deptRes, teacherRes] = await Promise.all([
        fetch("/api/admin/departments"),
        fetch("/api/admin/teachers"),
      ]);
      const [deptJson, teacherJson] = await Promise.all([
        deptRes.json(),
        teacherRes.json(),
      ]);

      if (deptJson.success) setDepartments(deptJson.data);
      if (teacherJson.success) setTeachers(teacherJson.data);
    } catch (err) {
      console.error("Gagal memuat data jurusan:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenCreate() {
    setEditingDept(null);
    setFormData({
      name: "",
      code: "",
      maxClasses: 2,
      capacity: 72,
      headOfDepartmentId: "",
      description: "",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(d: DepartmentItem) {
    setEditingDept(d);
    setFormData({
      name: d.name,
      code: d.code,
      maxClasses: d.maxClasses || 2,
      capacity: d.capacity || (d.maxClasses || 2) * 36,
      headOfDepartmentId: d.headOfDepartmentId?._id || "",
      description: d.description || "",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError("Nama dan kode jurusan wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingDept
        ? `/api/admin/departments/${editingDept._id}`
        : "/api/admin/departments";
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.message || "Gagal menyimpan jurusan");
      } else {
        setIsModalOpen(false);
        loadData();
      }
    } catch {
      setFormError("Terjadi kesalahan sistem saat menyimpan jurusan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    if (confirmInput.trim().toUpperCase() !== deleteTarget.code.toUpperCase()) {
      setDeleteError(`Teks konfirmasi tidak cocok. Ketik "${deleteTarget.code}" untuk melanjutkan.`);
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/departments/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setDeleteError(json.message || "Gagal menghapus jurusan");
      } else {
        setDeleteTarget(null);
        setConfirmInput("");
        loadData();
      }
    } catch {
      setDeleteError("Terjadi kesalahan sistem");
    } finally {
      setDeleting(false);
    }
  }

  const filteredDepts = departments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });

  const totalCapacity = departments.reduce((sum, d) => sum + (d.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header matching Figma Learnix */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Jurusan</h1>
          <p className="text-sm text-slate-500">
            Kelola data program keahlian SMK, kuota paralel rombel, dan kapasitas siswa.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          leftIcon={<Plus className="size-4" />}
        >
          Tambah Jurusan
        </Button>
      </div>

      {/* Stats Cards matching Image 2 Bottom-Left */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Layers className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">TOTAL JURUSAN</div>
            <div className="text-2xl font-bold text-slate-800">{departments.length}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Users className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">TOTAL KAPASITAS</div>
            <div className="text-2xl font-bold text-slate-800">{totalCapacity.toLocaleString()} Siswa</div>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari jurusan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Departments Table matching Image 2 Bottom-Left */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">#</th>
              <th className="py-3.5 px-6">Nama Jurusan</th>
              <th className="py-3.5 px-6">Kode</th>
              <th className="py-3.5 px-6">Kepala Jurusan</th>
              <th className="py-3.5 px-6">Jml Kelas</th>
              <th className="py-3.5 px-6">Jml Siswa</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat daftar jurusan...</span>
                </td>
              </tr>
            ) : filteredDepts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  Tidak ada jurusan yang sesuai.
                </td>
              </tr>
            ) : (
              filteredDepts.map((d, index) => (
                <tr key={d._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 text-slate-400 font-mono text-xs">{index + 1}</td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{d.name}</div>
                    {d.description && (
                      <div className="text-xs text-slate-400 line-clamp-1 max-w-sm">{d.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-xs text-blue-700">
                    <span className="rounded-md bg-blue-50 px-2 py-1 border border-blue-200">
                      {d.code}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-700">
                    {d.headOfDepartmentId ? (
                      <span className="font-medium">{d.headOfDepartmentId.name}</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum ditentukan</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-800">{d.classCount || 0}</span>
                    <span className="text-xs text-slate-400"> / {d.maxClasses} Paralel</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-800">{d.studentCount || 0}</span>
                    <span className="text-xs text-slate-400"> / {d.capacity} Kuota</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(d)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Jurusan"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(d);
                          setConfirmInput("");
                          setDeleteError("");
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Jurusan"
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

      {/* Modal Tambah / Edit Jurusan matching Image 2 Bottom-Right */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  {editingDept ? "Edit Jurusan" : "Tambah Jurusan Baru"}
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
                  Nama Jurusan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Pengembangan Perangkat Lunak & Gim"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Jurusan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: PPLG"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Kelas Maksimal (Paralel) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.maxClasses}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 1;
                      setFormData({ ...formData, maxClasses: count, capacity: count * 36 });
                    }}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kepala Jurusan (Opsional)
                </label>
                <select
                  value={formData.headOfDepartmentId}
                  onChange={(e) => setFormData({ ...formData, headOfDepartmentId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Kepala Jurusan --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} {t.degree ? `, ${t.degree}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Jurusan
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Penjelasan ringkas kompetensi keahlian..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                  {submitting ? "Menyimpan..." : "Simpan Jurusan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Delete Confirmation Modal matching Image 3 Bottom-Right */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ShieldAlert className="size-6" />
            </div>

            <h3 className="mt-3 font-bold text-slate-900 text-base">
              MOHON KETIK KODE JURUSAN UNTUK MENGHAPUS
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Anda akan menghapus jurusan <strong>{deleteTarget.name}</strong>. Ketik{" "}
              <strong className="font-mono text-rose-600">{deleteTarget.code}</strong> di bawah ini untuk mengonfirmasi.
            </p>

            {deleteError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-4">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={deleteTarget.code}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono font-bold uppercase text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="mt-5 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setConfirmInput("");
                  setDeleteError("");
                }}
              >
                CANCEL
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleting || confirmInput.trim().toUpperCase() !== deleteTarget.code.toUpperCase()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {deleting ? "MENGHAPUS..." : "HAPUS JURUSAN"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
