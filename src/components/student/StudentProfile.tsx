"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  GraduationCap,
  Layers,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  BookOpen,
  Award,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Spinner, Badge, Button } from "@/components/ui";

interface StudentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  nis?: string;
  nisn?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthPlace?: string;
  birthDate?: string;
  phone?: string;
  photoUrl?: string;
  grade?: string;
  classId?: { _id: string; name: string; grade: string; academicYear?: string };
  departmentId?: { _id: string; name: string; code: string };
  academicYear?: string;
  isActive: boolean;
  createdAt?: string;
}

interface AcademicStats {
  totalClasses: number;
  completedAssignments: number;
  averageGrade: number;
}

export function StudentProfile() {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [stats, setStats] = useState<AcademicStats>({
    totalClasses: 0,
    completedAssignments: 0,
    averageGrade: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form states for editable fields
  const [formData, setFormData] = useState({
    phone: "",
    gender: "Laki-laki",
    birthPlace: "",
    birthDate: "",
  });

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/siswa/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data.user);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
        setFormData({
          phone: json.data.user.phone || "",
          gender: json.data.user.gender || "Laki-laki",
          birthPlace: json.data.user.birthPlace || "",
          birthDate: json.data.user.birthDate
            ? new Date(json.data.user.birthDate).toISOString().split("T")[0]
            : "",
        });
      }
    } catch (err) {
      console.error("Gagal memuat profil siswa:", err);
      setFeedback({ type: "error", message: "Gagal memuat profil siswa" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/siswa/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success && json.data?.user) {
        setUser(json.data.user);
        setIsEditing(false);
        setFeedback({
          type: "success",
          message: "Data profil berhasil diperbarui!",
        });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({
          type: "error",
          message: json.message || "Gagal memperbarui profil",
        });
      }
    } catch (err) {
      console.error("Gagal menyimpan profil:", err);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menyimpan",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-600">
        Data profil tidak dapat dimuat. Silakan muat ulang halaman.
      </div>
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "S";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Profil Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi identitas akun, data rombel kelas, dan rekam akademik di Learnix LMS.
          </p>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            leftIcon={<Edit3 className="size-3.5" />}
          >
            Edit Profil
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setFormData({
                phone: user.phone || "",
                gender: user.gender || "Laki-laki",
                birthPlace: user.birthPlace || "",
                birthDate: user.birthDate
                  ? new Date(user.birthDate).toISOString().split("T")[0]
                  : "",
              });
            }}
            className="text-xs font-semibold"
            leftIcon={<X className="size-3.5" />}
          >
            Batal
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-semibold transition animate-in fade-in ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Hero Profile Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-64 bg-linear-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="size-22 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-md shrink-0">
            {initial}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                Siswa Aktif
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                Tingkat {user.grade || user.classId?.grade || "12"}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-mono">
              NISN: <span className="font-semibold text-slate-700">{user.nisn || "-"}</span> • NIS:{" "}
              <span className="font-semibold text-slate-700">{user.nis || "-"}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="size-3.5 text-blue-600" />
                {user.classId?.name || "Kelas Belum Diatur"}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-purple-600" />
                {user.departmentId?.name || "PPLG"}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-slate-400" />
                {user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100/80 flex items-center gap-3.5">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Mata Pelajaran
              </p>
              <p className="text-lg font-bold text-slate-900">{stats.totalClasses} Kelas</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100/80 flex items-center gap-3.5">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Tugas Terkumpul
              </p>
              <p className="text-lg font-bold text-slate-900">
                {stats.completedAssignments} Selesai
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100/80 flex items-center gap-3.5">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <Award className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Rata-rata Nilai
              </p>
              <p className="text-lg font-bold text-slate-900">
                {stats.averageGrade > 0 ? stats.averageGrade : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details and Edit Form */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Biodata Lengkap Siswa</h3>
            <p className="text-xs text-slate-400">
              {isEditing
                ? "Perbarui informasi kontak dan data pribadi Anda"
                : "Informasi resmi siswa terdaftar di Learnix LMS"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Terverifikasi Sekolah</span>
          </div>
        </div>

        {!isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Nama Lengkap
              </span>
              <p className="text-xs font-semibold text-slate-800">{user.name}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Akun Siswa
              </span>
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Mail className="size-3.5 text-blue-600" />
                {user.email}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                NISN (Nomor Induk Siswa Nasional)
              </span>
              <p className="text-xs font-semibold text-slate-800 font-mono">
                {user.nisn || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                NIS (Nomor Induk Sekolah)
              </span>
              <p className="text-xs font-semibold text-slate-800 font-mono">
                {user.nis || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kelas (Rombel)
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {user.classId?.name || "Belum Ditentukan"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kompetensi Keahlian (Jurusan)
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {user.departmentId?.name || "Pengembangan Perangkat Lunak & Gim (PPLG)"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Nomor Telepon / WhatsApp
              </span>
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Phone className="size-3.5 text-blue-600" />
                {user.phone || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Jenis Kelamin
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {user.gender || "Laki-laki"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tempat & Tanggal Lahir
              </span>
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-600" />
                {user.birthPlace || "-"},{" "}
                {user.birthDate
                  ? new Date(user.birthDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="081234567890"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Kelamin
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value as any })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={formData.birthPlace}
                  onChange={(e) =>
                    setFormData({ ...formData, birthPlace: e.target.value })
                  }
                  placeholder="Contoh: Bandung"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                leftIcon={<Save className="size-3.5" />}
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
