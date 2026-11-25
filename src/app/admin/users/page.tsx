"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  loginUsername?: string;
  isActivated?: boolean;
  mustChangePassword?: boolean;
  accountStatus?: "Aktif" | "Belum Diaktivasi" | "Non-Aktif";
  accountStatusCode?: "active" | "unactivated" | "inactive";
  role: "admin" | "guru" | "kurikulum" | "kepsek" | "siswa";
  nip?: string;
  nisn?: string;
  phone?: string;
  isActive: boolean;
  tahunBergabung?: string;
  joinDate?: string;
  createdAt?: string;
}

function getDisplayAccountStatus(
  u: Pick<
    UserItem,
    "accountStatus" | "isActive" | "role" | "isActivated" | "mustChangePassword"
  >
): "Aktif" | "Belum Diaktivasi" | "Non-Aktif" {
  if (
    u.accountStatus === "Non-Aktif" ||
    u.accountStatus === "Belum Diaktivasi" ||
    u.accountStatus === "Aktif"
  ) {
    return u.accountStatus;
  }
  if (u.isActive === false) {
    return "Non-Aktif";
  }
  if (
    (u.role === "guru" || u.role === "kurikulum") &&
    (u.isActivated === false || u.mustChangePassword === true)
  ) {
    return "Belum Diaktivasi";
  }
  return "Aktif";
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
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  function toggleShowPassword(id: string) {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    loginUsername: "",
    password: "",
    role: "guru" as "admin" | "guru" | "kurikulum" | "kepsek" | "siswa",
    nip: "",
    nisn: "",
    phone: "",
    isActive: true,
    requireActivation: true,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, selectedStatus, search]);

  function handleOpenCreate() {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      loginUsername: "",
      password: "password123",
      role: "guru",
      nip: "",
      nisn: "",
      phone: "",
      isActive: true,
      requireActivation: true,
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(u: UserItem) {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      loginUsername: u.loginUsername || "",
      password: "",
      role: u.role,
      nip: u.nip || "",
      nisn: u.nisn || "",
      phone: u.phone || "",
      isActive: u.isActive,
      requireActivation: true,
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

  // Delete confirmation modal state (supports detailed Guru impact summary per Task 1)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleteSummary, setDeleteSummary] = useState<{
    classCount: number;
    materialCount: number;
    assignmentCount: number;
    quizCount: number;
    submissionCount: number;
    gradedSubmissionCount: number;
  } | null>(null);
  const [loadingDeleteSummary, setLoadingDeleteSummary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  async function handleDelete(u: UserItem) {
    setDeleteTarget(u);
    setDeleteSummary(null);
    if (u.role === "guru") {
      setLoadingDeleteSummary(true);
      try {
        const res = await fetch(`/api/admin/users/${u._id}`);
        const json = await res.json();
        if (res.ok && json.success && (json.deletionSummary || json.data?.deletionSummary)) {
          setDeleteSummary(json.deletionSummary || json.data.deletionSummary);
        } else {
          setDeleteSummary({
            classCount: 0,
            materialCount: 0,
            assignmentCount: 0,
            quizCount: 0,
            submissionCount: 0,
            gradedSubmissionCount: 0,
          });
        }
      } catch {
        setDeleteSummary({
          classCount: 0,
          materialCount: 0,
          assignmentCount: 0,
          quizCount: 0,
          submissionCount: 0,
          gradedSubmissionCount: 0,
        });
      } finally {
        setLoadingDeleteSummary(false);
      }
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal menghapus akun");
      } else {
        setActionNotice(json.message || `Akun ${deleteTarget.name} berhasil dihapus.`);
        setDeleteTarget(null);
        setDeleteSummary(null);
        loadData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    } finally {
      setDeleting(false);
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

      {actionNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 transition"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

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
          <option value="unactivated">Belum Diaktivasi</option>
          <option value="inactive">Non-Aktif</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Email</th>
              <th className="py-3.5 px-6">Password</th>
              <th className="py-3.5 px-6">Role</th>
              <th className="py-3.5 px-6">Tahun bergabung</th>
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
                    <div className="font-mono text-xs font-semibold text-slate-900">{u.email}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{u.name}</div>
                    {(u.role === "guru" || u.role === "kurikulum") && (
                      <div className="mt-0.5 text-[11px] font-mono text-blue-600">
                        Username: {u.loginUsername || "-"}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {showPasswords[u._id] ? "password123" : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(u._id)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
                        title={showPasswords[u._id] ? "Sembunyikan password" : "Intip password"}
                      >
                        {showPasswords[u._id] ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold uppercase border ${
                        roleColors[u.role] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-700">
                    {u.tahunBergabung ||
                      (u.createdAt ? new Date(u.createdAt).getFullYear().toString() : "-")}
                  </td>
                  <td className="py-4 px-6">
                    {(() => {
                      const statusLabel = getDisplayAccountStatus(u);
                      if (statusLabel === "Non-Aktif") {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                            <XCircle className="size-3" /> Non-Aktif
                          </span>
                        );
                      }
                      if (statusLabel === "Belum Diaktivasi") {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                            <AlertCircle className="size-3" /> Belum Diaktivasi
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="size-3" /> Aktif
                        </span>
                      );
                    })()}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {deleteTarget.role === "guru"
                    ? "Hapus Akun Guru?"
                    : `Hapus Akun ${deleteTarget.name}?`}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {deleteTarget.role === "guru"
                    ? "Apakah Anda yakin ingin menghapus akun guru ini? Tindakan ini juga akan menghapus seluruh Kelas Mapel yang terhubung dengan guru tersebut beserta data kelas terkait. Data yang terhapus mungkin tidak dapat dipulihkan."
                    : `Apakah Anda yakin ingin menghapus akun ${deleteTarget.name} (${deleteTarget.email})? Tindakan ini tidak dapat dibatalkan.`}
                </p>
              </div>
            </div>

            {deleteTarget.role === "guru" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-semibold text-slate-500">Akun Guru:</span>
                  <span className="font-bold text-slate-900">
                    {deleteTarget.name}
                  </span>
                </div>
                {loadingDeleteSummary ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-slate-500">
                    <Spinner size="sm" />
                    <span>Memeriksa Kelas Mapel dan data terkait...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Kelas Mapel terkait:</span>
                      <span className="font-bold text-slate-900">
                        {deleteSummary?.classCount ?? 0} kelas
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Materi:</span>
                      <span className="font-bold text-slate-900">
                        {deleteSummary?.materialCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Tugas:</span>
                      <span className="font-bold text-slate-900">
                        {deleteSummary?.assignmentCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Kuis:</span>
                      <span className="font-bold text-slate-900">
                        {deleteSummary?.quizCount ?? 0}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteSummary(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting || loadingDeleteSummary}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {deleting
                  ? "Menghapus..."
                  : deleteTarget.role === "guru"
                  ? "Hapus Guru dan Kelas"
                  : "Ya, Hapus Akun"}
              </Button>
            </div>
          </div>
        </div>
      )}

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

              {(formData.role === "admin" ||
                formData.role === "guru" ||
                formData.role === "kurikulum" ||
                formData.role === "kepsek") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP (Nomor Induk Pegawai)
                  </label>
                  <input
                    type="text"
                    value={formData.nip || ""}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Contoh: 198503152010011002"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {(formData.role === "guru" || formData.role === "kurikulum") && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Username Login {editingUser ? "" : "Awal (Opsional)"}
                    </label>
                    {editingUser && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Terpisah dari Nama Resmi)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.loginUsername || ""}
                    disabled={Boolean(editingUser)}
                    onChange={(e) => setFormData({ ...formData, loginUsername: e.target.value })}
                    placeholder="Contoh: ahmad.fauzan (otomatis dibuat jika kosong)"
                    className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-hidden ${
                      editingUser
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : "text-slate-800 focus:border-blue-500"
                    }`}
                  />
                </div>
              )}

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

              {editingUser && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tahun Bergabung
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      (Tidak dapat diubah)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={
                      editingUser.tahunBergabung ||
                      (editingUser.joinDate ? new Date(editingUser.joinDate).getFullYear().toString() : "") ||
                      (editingUser.createdAt ? new Date(editingUser.createdAt).getFullYear().toString() : "-")
                    }
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              )}

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
