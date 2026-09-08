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
  KeyRound,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import { Button, Spinner, Badge } from "@/components/ui";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "guru" | "kurikulum" | "kepsek" | "siswa";
  nip?: string;
  nisn?: string;
  phone?: string;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    guru: 0,
    siswa: 0,
    kurikulum: 0,
    kepsek: 0,
    admin: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRole, setSelectedRole] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "guru" as "admin" | "guru" | "kurikulum" | "kepsek" | "siswa",
    nip: "",
    nisn: "",
    phone: "",
    isActive: true,
  });

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRole !== "all") params.set("role", selectedRole);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        if (json.counts) setCounts(json.counts);
      }
    } catch (err) {
      console.error("Gagal memuat pengguna:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedRole, selectedStatus, search]);

  function handleOpenCreate() {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "password123",
      role: "guru",
      nip: "",
      nisn: "",
      phone: "",
      isActive: true,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(u: UserItem) {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      nip: u.nip || "",
      nisn: u.nisn || "",
      phone: u.phone || "",
      isActive: u.isActive,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const url = editingUser ? `/api/admin/users/${editingUser._id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.message || "Gagal menyimpan akun");
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

  async function handleToggleActive(u: UserItem) {
    try {
      const res = await fetch(`/api/admin/users/${u._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal mengubah status pengguna");
      } else {
        loadData();
      }
    } catch {
      alert("Terjadi kesalahan");
    }
  }

  async function handleDelete(u: UserItem) {
    if (!confirm(`Hapus akun ${u.name} (${u.email})?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal menghapus akun");
      } else {
        loadData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  }

  const roleColors: Record<string, string> = {
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    guru: "bg-purple-100 text-purple-800 border-purple-200",
    kurikulum: "bg-amber-100 text-amber-800 border-amber-200",
    kepsek: "bg-indigo-100 text-indigo-800 border-indigo-200",
    siswa: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500">
            Kelola akun pengguna, status aktivasi, dan penetapan role sistem LMS.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          leftIcon={<Plus className="size-4" />}
        >
          Tambah Pengguna
        </Button>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "all", label: "Semua", count: counts.all },
          { key: "guru", label: "Guru", count: counts.guru },
          { key: "siswa", label: "Siswa", count: counts.siswa },
          { key: "kurikulum", label: "Kurikulum", count: counts.kurikulum },
          { key: "kepsek", label: "Kepsek", count: counts.kepsek },
          { key: "admin", label: "Admin", count: counts.admin },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedRole(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedRole === tab.key
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                selectedRole === tab.key ? "bg-blue-700 text-white" : "bg-white text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, NIP, atau NISN..."
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

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Nama Pengguna</th>
              <th className="py-3.5 px-6">Email / Username</th>
              <th className="py-3.5 px-6">Role</th>
              <th className="py-3.5 px-6">Identitas (NIP/NISN)</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat pengguna...</span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">{u.email}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold uppercase border ${
                        roleColors[u.role] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">
                    {u.nip || u.nisn || "-"}
                  </td>
                  <td className="py-4 px-6">
                    {u.isActive ? (
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
                        onClick={() => handleToggleActive(u)}
                        className={`rounded-lg p-1.5 transition text-xs font-semibold ${
                          u.isActive
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={u.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                      >
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Profil & Role"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Akun"
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

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {editingUser ? "Edit Pengguna & Role" : "Tambah Pengguna Baru"}
              </h3>
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
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Institusi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "admin" | "guru" | "kurikulum" | "kepsek" | "siswa",
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="guru">Guru</option>
                    <option value="siswa">Siswa</option>
                    <option value="kurikulum">Kurikulum</option>
                    <option value="kepsek">Kepala Sekolah</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {editingUser ? "(Kosongkan jika tidak diubah)" : <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Minimal 6 karakter"}
                  required={!editingUser}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP (Untuk Guru / Staf)
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NISN (Untuk Siswa)
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                  {submitting ? "Menyimpan..." : "Simpan Pengguna"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
