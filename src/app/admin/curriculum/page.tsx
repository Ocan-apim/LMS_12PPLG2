"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface CurriculumUser {
  _id: string;
  name: string;
  email: string;
  nip?: string;
  phone?: string;
  tahunBergabung?: string;
  joinDate?: string;
  createdAt: string;
  isActive: boolean;
}

export default function AdminCurriculumPage() {
  const [curriculumStaff, setCurriculumStaff] = useState<CurriculumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<CurriculumUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "password123",
    nip: "",
    phone: "",
    tahunBergabung: new Date().getFullYear().toString(),
    isActive: true,
  });

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CurriculumUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("role", "kurikulum");
      if (search) params.set("search", search);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCurriculumStaff(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat staf kurikulum:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedStatus]);

  function handleOpenCreate() {
    setEditingStaff(null);
    setFormData({
      name: "",
      email: "",
      password: "password123",
      nip: "",
      phone: "",
      tahunBergabung: new Date().getFullYear().toString(),
      isActive: true,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(staff: CurriculumUser) {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: "",
      nip: staff.nip || "",
      phone: staff.phone || "",
      tahunBergabung:
        staff.tahunBergabung ||
        (staff.joinDate ? new Date(staff.joinDate).getFullYear().toString() : "") ||
        (staff.createdAt ? new Date(staff.createdAt).getFullYear().toString() : ""),
      isActive: staff.isActive,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingStaff) {
        // Update existing
        const payload: Record<string, unknown> = {
          name: formData.name,
          email: formData.email,
          nip: formData.nip,
          phone: formData.phone,
          tahunBergabung: formData.tahunBergabung,
          isActive: formData.isActive,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        const res = await fetch(`/api/admin/users/${editingStaff._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          setFormError(json.message || "Gagal memperbarui staf kurikulum");
        } else {
          setIsModalOpen(false);
          loadData();
        }
      } else {
        // Create new
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            role: "kurikulum",
            password: formData.password || "password123",
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setFormError(json.message || "Gagal menambahkan staf kurikulum");
        } else {
          setIsModalOpen(false);
          loadData();
        }
      }
    } catch {
      setFormError("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(staff: CurriculumUser) {
    try {
      const res = await fetch(`/api/admin/users/${staff._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !staff.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        loadData();
      }
    } catch {
      alert("Gagal mengubah status staf");
    }
  }

  async function handleDeleteStaff() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        loadData();
      } else {
        alert(json.message || "Gagal menghapus data");
      }
    } catch {
      alert("Terjadi kesalahan sistem saat menghapus staf");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Kurikulum</h1>
          <p className="text-sm text-slate-500">
            Kelola akun tim pengembang kurikulum, silabus, dan pemantauan akademik sekolah.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          leftIcon={<Plus className="size-4" />}
        >
          Tambah Staf Kurikulum
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2">

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              STAF AKTIF
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {curriculumStaff.filter((s) => s.isActive).length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <XCircle className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              NONAKTIF
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {curriculumStaff.filter((s) => !s.isActive).length}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau NIP staf kurikulum..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Nama Staf Kurikulum</th>
              <th className="py-3.5 px-6">Email Akun</th>
              <th className="py-3.5 px-6">NIP / Identitas</th>
              <th className="py-3.5 px-6">Tahun Bergabung</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat data tim kurikulum...</span>
                </td>
              </tr>
            ) : curriculumStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Belum ada data staf kurikulum.
                </td>
              </tr>
            ) : (
              curriculumStaff.map((staff) => (
                <tr key={staff._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                        {staff.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{staff.name}</div>
                        <div className="text-xs text-slate-400">Tim Kurikulum</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">{staff.email}</td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">{staff.nip || "-"}</td>
                  <td className="py-4 px-6 text-slate-700 text-xs font-medium">
                    {staff.tahunBergabung ||
                      (staff.joinDate ? new Date(staff.joinDate).getFullYear() : "") ||
                      (staff.createdAt ? new Date(staff.createdAt).getFullYear() : "-")}
                  </td>
                  <td className="py-4 px-6">
                    {staff.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                        <XCircle className="size-3" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          staff.isActive
                            ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={staff.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                      >
                        {staff.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Staf"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(staff)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Staf"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {editingStaff ? "Edit Staf Kurikulum" : "Tambah Staf Kurikulum"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
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
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Akun <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: kurikulum@smkcitranegara.sch.id"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Akun {editingStaff && "(Kosongkan jika tidak ingin diubah)"}
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingStaff ? "Biarkan kosong untuk password lama" : "password123"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="19800101..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tahun Bergabung
                    </label>
                    {editingStaff && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Tidak dapat diubah)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.tahunBergabung}
                    disabled={Boolean(editingStaff)}
                    onChange={(e) => setFormData({ ...formData, tahunBergabung: e.target.value })}
                    placeholder="2024"
                    className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-hidden ${
                      editingStaff
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : "text-slate-800 focus:border-blue-500"
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {submitting ? "Menyimpan..." : "Simpan Staf"}
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
            <h3 className="mt-4 font-bold text-slate-900">Hapus Staf Kurikulum?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus staf kurikulum <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                onClick={handleDeleteStaff}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
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
