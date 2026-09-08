"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  BookOpen,
  GraduationCap,
  Users,
  AlertCircle,
  X,
  Radio,
} from "lucide-react";
import { Button, Spinner, Badge } from "@/components/ui";

interface AcademicYearItem {
  _id: string;
  name: string;
  semester: "Ganjil" | "Genap";
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

interface AssignmentItem {
  _id: string;
  teacherId: { _id: string; name: string; nip?: string; degree?: string };
  subjectId: { _id: string; name: string; code: string };
  classId: { _id: string; name: string; grade: string };
  academicYear: string;
}

interface TeacherOption {
  _id: string;
  name: string;
  degree?: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  code: string;
}

interface ClassOption {
  _id: string;
  name: string;
}

export default function AdminAcademicYearsPage() {
  const [activeTab, setActiveTab] = useState<"years" | "assignments">("years");

  // Academic years state
  const [years, setYears] = useState<AcademicYearItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New Year Modal
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("2025/2026");
  const [newSemester, setNewSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [submittingYear, setSubmittingYear] = useState(false);
  const [yearError, setYearError] = useState("");

  // New Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignClassId, setAssignClassId] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [yearRes, assignRes, teacherRes, subRes, classRes] = await Promise.all([
        fetch("/api/admin/academic-years"),
        fetch("/api/admin/academic-assignments"),
        fetch("/api/admin/teachers"),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/classes"),
      ]);

      const [yearJson, assignJson, teacherJson, subJson, classJson] = await Promise.all([
        yearRes.json(),
        assignRes.json(),
        teacherRes.json(),
        subRes.json(),
        classRes.json(),
      ]);

      if (yearJson.success) setYears(yearJson.data);
      if (assignJson.success) setAssignments(assignJson.data);
      if (teacherJson.success) setTeachers(teacherJson.data);
      if (subJson.success) setSubjects(subJson.data);
      if (classJson.success) setClasses(classJson.data);
    } catch (err) {
      console.error("Gagal memuat data akademik:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleActivateYear(id: string) {
    try {
      const res = await fetch(`/api/admin/academic-years/${id}/activate`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (json.success) {
        loadData();
      } else {
        alert(json.message || "Gagal mengaktifkan tahun ajaran");
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  }

  async function handleCreateYear(e: React.FormEvent) {
    e.preventDefault();
    setYearError("");
    setSubmittingYear(true);

    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newYearName.trim(),
          semester: newSemester,
          isActive: false,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setYearError(json.message || "Gagal membuat tahun ajaran");
      } else {
        setIsYearModalOpen(false);
        loadData();
      }
    } catch {
      setYearError("Terjadi kesalahan sistem");
    } finally {
      setSubmittingYear(false);
    }
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setAssignError("");
    setSubmittingAssign(true);

    const activeYear = years.find((y) => y.isActive);
    const activeYearStr = activeYear ? `${activeYear.name} - ${activeYear.semester}` : "2024/2025 - Genap";

    try {
      const res = await fetch("/api/admin/academic-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: assignTeacherId,
          subjectId: assignSubjectId,
          classId: assignClassId,
          academicYear: activeYearStr,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setAssignError(json.message || "Gagal menambahkan penugasan");
      } else {
        setIsAssignModalOpen(false);
        setAssignTeacherId("");
        setAssignSubjectId("");
        setAssignClassId("");
        loadData();
      }
    } catch {
      setAssignError("Terjadi kesalahan sistem");
    } finally {
      setSubmittingAssign(false);
    }
  }

  async function handleDeleteAssignment(id: string) {
    if (!confirm("Hapus penugasan pengajar ini?")) return;
    try {
      await fetch(`/api/admin/academic-assignments/${id}`, { method: "DELETE" });
      loadData();
    } catch {
      alert("Gagal menghapus penugasan");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tahun Ajaran & Data Akademik</h1>
          <p className="text-sm text-slate-500">
            Kelola periode semester berjalan dan penugasan hubungan Guru ↔ Mata Pelajaran ↔ Kelas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "years" ? (
            <Button
              onClick={() => {
                setYearError("");
                setIsYearModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              leftIcon={<Plus className="size-4" />}
            >
              Tambah Tahun Ajaran
            </Button>
          ) : (
            <Button
              onClick={() => {
                setAssignError("");
                setIsAssignModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              leftIcon={<Plus className="size-4" />}
            >
              Tugaskan Pengajar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("years")}
          className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-semibold transition ${
            activeTab === "years"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="size-4" />
          <span>Tahun Ajaran & Semester</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {years.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("assignments")}
          className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-semibold transition ${
            activeTab === "assignments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Penugasan Guru ↔ Mapel ↔ Kelas</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {assignments.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Years & Semesters */}
      {activeTab === "years" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Tahun Ajaran</th>
                <th className="py-3.5 px-6">Semester</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Spinner size="md" />
                    <span className="ml-2">Memuat tahun ajaran...</span>
                  </td>
                </tr>
              ) : years.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    Belum ada data tahun ajaran.
                  </td>
                </tr>
              ) : (
                years.map((y) => (
                  <tr key={y._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-semibold text-slate-900">{y.name}</td>
                    <td className="py-4 px-6 text-slate-700">Semester {y.semester}</td>
                    <td className="py-4 px-6">
                      {y.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> AKTIF BERJALAN
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {!y.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivateYear(y._id)}
                          className="hover:border-emerald-500 hover:text-emerald-700"
                        >
                          Jadikan Aktif
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Assignments (Guru ↔ Mapel ↔ Kelas) */}
      {activeTab === "assignments" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Guru Pengajar</th>
                <th className="py-3.5 px-6">Mata Pelajaran</th>
                <th className="py-3.5 px-6">Kelas Rombel</th>
                <th className="py-3.5 px-6">Tahun Ajaran</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Spinner size="md" />
                    <span className="ml-2">Memuat penugasan...</span>
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Belum ada penugasan pengajar. Klik &quot;Tugaskan Pengajar&quot; di atas.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {a.teacherId?.name}
                        {a.teacherId?.degree ? `, ${a.teacherId.degree}` : ""}
                      </div>
                      {a.teacherId?.nip && (
                        <div className="text-xs text-slate-400">NIP. {a.teacherId.nip}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                        {a.subjectId?.name} ({a.subjectId?.code})
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                        {a.classId?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs">{a.academicYear}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(a._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus Penugasan"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Tahun Ajaran */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Tambah Tahun Ajaran Baru</h3>
              <button onClick={() => setIsYearModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="mt-4 space-y-4">
              {yearError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{yearError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Periode Tahun Ajaran
                </label>
                <input
                  type="text"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="Contoh: 2025/2026"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester
                </label>
                <select
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value as "Ganjil" | "Genap")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsYearModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={submittingYear} className="bg-blue-600 text-white hover:bg-blue-700">
                  {submittingYear ? "Menyimpan..." : "Simpan Tahun Ajaran"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Penugasan Pengajar */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Penugasan Pengajar (Guru ↔ Mapel ↔ Kelas)</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="mt-4 space-y-4">
              {assignError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{assignError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Guru Pengajar <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignTeacherId}
                  onChange={(e) => setAssignTeacherId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} {t.degree ? `, ${t.degree}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Kelas Rombel <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignClassId}
                  onChange={(e) => setAssignClassId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={submittingAssign} className="bg-blue-600 text-white hover:bg-blue-700">
                  {submittingAssign ? "Menugaskan..." : "Tugaskan Pengajar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
