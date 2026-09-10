"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Users,
  GraduationCap,
  UserCheck,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import {
  Button,
  Badge,
  Spinner,
} from "@/components/ui";

interface ClassItem {
  _id: string;
  name: string;
  grade: string;
  parallelNumber: number;
  academicYear: string;
  maxCapacity: number;
  studentCount: number;
  departmentId?: { _id: string; name: string; code: string };
  homeroomTeacherId?: { _id: string; name: string; nip?: string; degree?: string };
}

interface TeacherOption {
  _id: string;
  name: string;
  nip?: string;
  degree?: string;
  isHomeroomTeacher?: boolean;
}

interface DeptOption {
  _id: string;
  name: string;
  code: string;
  maxClasses: number;
}

interface EnrolledStudentInfo {
  _id: string;
  name: string;
  nis?: string;
  nisn?: string;
  email: string;
  password?: string;
  gender?: string;
  birthPlace?: string;
  birthDate?: string;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // View students modal
  const [viewStudentsClass, setViewStudentsClass] = useState<ClassItem | null>(null);
  const [classStudents, setClassStudents] = useState<EnrolledStudentInfo[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    grade: "10",
    departmentId: "",
    parallelNumber: 1,
    homeroomTeacherId: "",
    maxCapacity: 36,
    academicYear: "2024/2025 - Genap",
  });

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleViewStudents(c: ClassItem) {
    setViewStudentsClass(c);
    setLoadingStudents(true);
    setStudentSearch("");
    try {
      const res = await fetch(`/api/admin/classes/${c._id}/students`);
      const json = await res.json();
      if (json.success) {
        setClassStudents(json.data);
      } else {
        setClassStudents([]);
      }
    } catch (err) {
      console.error("Gagal memuat siswa:", err);
      setClassStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  // Load classes, teachers, departments
  async function loadData() {
    setLoading(true);
    try {
      const [classRes, teacherRes, deptRes] = await Promise.all([
        fetch(`/api/admin/classes?grade=${selectedGrade}&departmentId=${selectedDept}&search=${encodeURIComponent(search)}`),
        fetch("/api/admin/teachers"),
        fetch("/api/admin/departments"),
      ]);

      const [classJson, teacherJson, deptJson] = await Promise.all([
        classRes.json(),
        teacherRes.json(),
        deptRes.json(),
      ]);

      if (classJson.success) setClasses(classJson.data);
      if (teacherJson.success) setTeachers(teacherJson.data);
      if (deptJson.success) setDepartments(deptJson.data);
    } catch (err) {
      console.error("Gagal memuat data kelas:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedGrade, selectedDept, search]);

  // Auto generate standard name: [Angka Romawi] [Jurusan] [Nomor Urut]
  function generateStandardName(grade: string, deptId: string, parallelNum: number) {
    const romanMap: Record<string, string> = { "10": "X", "11": "XI", "12": "XII" };
    const roman = romanMap[grade] || grade;
    const dept = departments.find((d) => d._id === deptId);
    const code = dept ? dept.code : "PPLG";
    return `${roman} ${code} ${parallelNum}`;
  }

  function handleOpenCreateModal() {
    setEditingClass(null);
    const defaultDept = departments[0]?._id || "";
    setFormData({
      name: generateStandardName("10", defaultDept, 1),
      grade: "10",
      departmentId: defaultDept,
      parallelNumber: 1,
      homeroomTeacherId: "",
      maxCapacity: 36,
      academicYear: "2024/2025 - Genap",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function handleOpenEditModal(c: ClassItem) {
    setEditingClass(c);
    setFormData({
      name: c.name,
      grade: c.grade,
      departmentId: c.departmentId?._id || "",
      parallelNumber: c.parallelNumber || 1,
      homeroomTeacherId: c.homeroomTeacherId?._id || "",
      maxCapacity: c.maxCapacity || 36,
      academicYear: c.academicYear || "2024/2025 - Genap",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const url = editingClass
        ? `/api/admin/classes/${editingClass._id}`
        : "/api/admin/classes";
      const method = editingClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) {
        setFormError(json.message || "Gagal menyimpan data kelas");
      } else {
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/classes/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Gagal menghapus kelas");
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

  // Calculate statistics
  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const totalHomeroom = classes.filter((c) => Boolean(c.homeroomTeacherId)).length;

  return (
    <div className="space-y-6">
      {/* Top Header matching Figma Learnix */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Kelas</h1>
          <p className="text-sm text-slate-500">
            Kelola data kelas, wali kelas, dan kapasitas siswa secara terpusat.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
          leftIcon={<Plus className="size-4" />}
        >
          Tambah Kelas
        </Button>
      </div>

      {/* Stats Cards matching Image 1 Top */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Kelas</div>
            <div className="text-2xl font-bold text-slate-800">{totalClasses}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Siswa Aktif</div>
            <div className="text-2xl font-bold text-slate-800">{totalStudents}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <UserCheck className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Wali Kelas</div>
            <div className="text-2xl font-bold text-slate-800">{totalHomeroom}</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama kelas atau guru..."
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
            <option value="10">Kelas 10 (X)</option>
            <option value="11">Kelas 11 (XI)</option>
            <option value="12">Kelas 12 (XII)</option>
          </select>

          {/* Department filter */}
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

      {/* Classes Table matching Image 1 Top */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Nama Kelas</th>
              <th className="py-3.5 px-6">Wali Kelas</th>
              <th className="py-3.5 px-6">Jumlah Siswa</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <Spinner size="md" />
                  <span className="ml-2">Memuat daftar kelas...</span>
                </td>
              </tr>
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  Tidak ada kelas yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              classes.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                        {c.grade}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.departmentId?.name ?? "Umum"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {c.homeroomTeacherId ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {c.homeroomTeacherId.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">
                            {c.homeroomTeacherId.name}
                            {c.homeroomTeacherId.degree ? `, ${c.homeroomTeacherId.degree}` : ""}
                          </div>
                          {c.homeroomTeacherId.nip && (
                            <div className="text-[11px] text-slate-400">NIP. {c.homeroomTeacherId.nip}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-400">Belum ada wali kelas</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{c.studentCount}</span>
                      <span className="text-xs text-slate-400">/ {c.maxCapacity} Siswa</span>
                    </div>
                    {/* Capacity progress bar */}
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.studentCount >= c.maxCapacity
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(100, (c.studentCount / c.maxCapacity) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewStudents(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                        title="Lihat Seluruh Siswa"
                      >
                        <Users className="size-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Kelas"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Kelas"
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

      {/* Modal Tambah / Edit Kelas matching Image 4 Top */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <GraduationCap className="size-4" />
                </div>
                <h3 className="font-bold text-slate-900">
                  {editingClass ? "Edit Data Kelas" : "Tambah Kelas Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 border border-rose-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column: Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tingkat Kelas
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) => {
                        const newGrade = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          grade: newGrade,
                          name: generateStandardName(newGrade, prev.departmentId, prev.parallelNumber),
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="10">Kelas 10</option>
                      <option value="11">Kelas 11</option>
                      <option value="12">Kelas 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jurusan SMK
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          departmentId: newDeptId,
                          name: generateStandardName(prev.grade, newDeptId, prev.parallelNumber),
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="">Pilih Jurusan...</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Paralel (Rombel)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.parallelNumber}
                      onChange={(e) => {
                        const newNum = Number(e.target.value) || 1;
                        setFormData((prev) => ({
                          ...prev,
                          parallelNumber: newNum,
                          name: generateStandardName(prev.grade, prev.departmentId, newNum),
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Kelas (Otomatis / Kustom)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: XII PPLG 2"
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wali Kelas
                    </label>
                    <select
                      value={formData.homeroomTeacherId}
                      onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="">-- Pilih Wali Kelas (Opsional) --</option>
                      {teachers.map((t) => {
                        const assignedClass = classes.find(
                          (c) =>
                            c.homeroomTeacherId?._id === t._id &&
                            (!editingClass || c._id !== editingClass._id)
                        );
                        const isAssignedToOther = Boolean(assignedClass);

                        return (
                          <option key={t._id} value={t._id} disabled={isAssignedToOther}>
                            {t.name} {t.degree ? `, ${t.degree}` : ""} {t.nip ? `(${t.nip})` : ""}
                            {isAssignedToOther ? ` (Sudah Walas ${assignedClass?.name})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kapasitas Maksimal Siswa
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Right Column: Panduan Penamaan & Tips matching Image 4 Top */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 text-xs text-blue-900">
                    <div className="flex items-center gap-2 font-bold text-blue-800 mb-2">
                      <Lightbulb className="size-4 text-amber-500" />
                      <span>Panduan Penamaan Kelas</span>
                    </div>
                    <p className="leading-relaxed">
                      Gunakan format standar SMK:
                      <br />
                      <strong className="font-semibold text-blue-950">[Angka Romawi] [Jurusan] [Nomor Urut]</strong>
                    </p>
                    <div className="mt-3 rounded-md bg-white p-2.5 font-mono text-[11px] border border-blue-200 text-blue-800">
                      Contoh: XII PPLG 2, X TJKT 1, XI DKV 3
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {submitting ? "Menyimpan..." : editingClass ? "Perbarui Kelas" : "Simpan Kelas"}
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
            <h3 className="mt-4 font-bold text-slate-900">Hapus Kelas {deleteTarget.name}?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan.
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
                {deleting ? "Menghapus..." : "Ya, Hapus Kelas"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Students Modal */}
      {viewStudentsClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Daftar Siswa Kelas {viewStudentsClass.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewStudentsClass.departmentId?.name || "Umum"} • Wali Kelas:{" "}
                    {viewStudentsClass.homeroomTeacherId?.name || "Belum ada"} • Total: {classStudents.length} Siswa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewStudentsClass(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Filter / Search inside modal */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, NISN, atau email siswa..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <span className="text-xs text-slate-500">
                {classStudents.filter((st) => {
                  const q = studentSearch.toLowerCase();
                  return (
                    st.name.toLowerCase().includes(q) ||
                    (st.nisn && st.nisn.toLowerCase().includes(q)) ||
                    st.email.toLowerCase().includes(q)
                  );
                }).length}{" "}
                siswa ditemukan
              </span>
            </div>

            {/* Student List Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingStudents ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Spinner size="md" />
                  <span className="text-xs">Memuat daftar siswa...</span>
                </div>
              ) : classStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada siswa yang terdaftar di kelas ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="pb-3 px-3 w-10">No</th>
                        <th className="pb-3 px-3">Nama Siswa</th>
                        <th className="pb-3 px-3">NIS / NISN</th>
                        <th className="pb-3 px-3">Email</th>
                        <th className="pb-3 px-3">Password Akun</th>
                        <th className="pb-3 px-3">Gender</th>
                        <th className="pb-3 px-3">Tempat / Tgl Lahir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents
                        .filter((st) => {
                          const q = studentSearch.toLowerCase();
                          return (
                            st.name.toLowerCase().includes(q) ||
                            (st.nis && st.nis.toLowerCase().includes(q)) ||
                            (st.nisn && st.nisn.toLowerCase().includes(q)) ||
                            st.email.toLowerCase().includes(q)
                          );
                        })
                        .map((st, idx) => (
                          <tr key={st._id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                                  {st.name.charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-800">{st.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{st.nis || st.nisn || "-"}</td>
                            <td className="py-2.5 px-3 text-slate-500">{st.email}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 border border-slate-200">
                                {st.password || "password123"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{st.gender || "-"}</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {st.birthPlace ? `${st.birthPlace}, ` : ""}
                              {st.birthDate ? new Date(st.birthDate).toLocaleDateString("id-ID") : "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Kapasitas: <strong className="text-slate-800">{viewStudentsClass.studentCount}</strong> / {viewStudentsClass.maxCapacity} Siswa
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewStudentsClass(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
