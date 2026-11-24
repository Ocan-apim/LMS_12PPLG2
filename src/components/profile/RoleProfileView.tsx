"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Mail,
  Hash,
  MapPin,
  Calendar,
  Phone,
  GraduationCap,
  Building2,
  BookOpen,
  ShieldCheck,
  Lock,
  KeyRound,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Award,
  Clock,
} from "lucide-react";
import type { Role } from "@/types";

interface ProfileUser {
  _id: string;
  name: string;
  email: string;
  loginUsername?: string | null;
  isActivated?: boolean;
  mustChangePassword?: boolean;
  activatedAt?: string | null;
  role: Role;
  isActive?: boolean;
  nis?: string | null;
  nisn?: string | null;
  nip?: string | null;
  gender?: "L" | "P" | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  degree?: string | null;
  lastEducation?: string | null;
  subjects?: string[];
  isHomeroomTeacher?: boolean;
  joinDate?: string | null;
  joinYear?: number | null;
  tahunBergabung?: number | null;
  grade?: string | null;
  academicYear?: string | null;
  classId?: {
    _id: string;
    name: string;
    grade?: string;
    academicYear?: string;
  } | null;
  departmentId?: {
    _id: string;
    name: string;
    code?: string;
  } | null;
  homeroomClassId?: {
    _id: string;
    name: string;
    grade?: string;
  } | null;
  createdAt?: string;
}

interface ProfilePermissions {
  canEditAccount: boolean;
  canEditEmail: boolean;
  canEditUsername?: boolean;
  canEditIdentificationNumber: boolean;
  identificationField: "nisn" | "nip" | null;
  identificationLabel: string | null;
  canEditPassword: boolean;
  isReadOnly: boolean;
}

interface ProfileCourseItem {
  _id: string;
  name: string;
  code?: string;
  subjectName?: string;
  rombelName?: string | null;
  teacherName?: string;
  studentsCount?: number;
}

interface ProfileResponseData {
  user: ProfileUser;
  permissions: ProfilePermissions;
  stats?: Record<string, number>;
  courses?: ProfileCourseItem[];
  classes?: ProfileCourseItem[];
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  siswa: "Siswa",
  guru: "Guru Pengampu",
  kurikulum: "Wakil Kepala Sekolah Bidang Kurikulum",
  kepsek: "Kepala Sekolah",
  admin: "Administrator Sistem",
};

function formatDateID(dateVal?: string | null): string {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="size-3.5 text-slate-400" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-800 break-words">
        {value || "-"}
      </p>
    </div>
  );
}

export function RoleProfileView({ role }: { role?: Role }) {
  const [data, setData] = useState<ProfileResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Account Form State (Email, Username, & Identification Number)
  const [email, setEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nisNumber, setNisNumber] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const apiEndpoint = role ? `/api/${role}/profile` : "/api/profile";

  async function fetchProfile() {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(apiEndpoint);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data profil");
      }
      const profileData: ProfileResponseData = json.data;
      setData(profileData);
      setEmail(profileData.user.email || "");
      setLoginUsername(profileData.user.loginUsername || "");
      if (profileData.user.role === "siswa") {
        setIdNumber(profileData.user.nisn || profileData.user.nis || "");
        setNisNumber(profileData.user.nis || "");
      } else if (
        profileData.user.role === "guru" ||
        profileData.user.role === "admin"
      ) {
        setIdNumber(profileData.user.nip || "");
      }
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "Terjadi kesalahan koneksi"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(apiEndpoint);
        const json = await res.json();
        if (!active) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data profil");
        }
        const profileData: ProfileResponseData = json.data;
        setData(profileData);
        setLoadError(null);
        setEmail(profileData.user.email || "");
        setLoginUsername(profileData.user.loginUsername || "");
        if (profileData.user.role === "siswa") {
          setIdNumber(profileData.user.nisn || profileData.user.nis || "");
          setNisNumber(profileData.user.nis || "");
        } else if (
          profileData.user.role === "guru" ||
          profileData.user.role === "admin"
        ) {
          setIdNumber(profileData.user.nip || "");
        }
      } catch (err: unknown) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Terjadi kesalahan koneksi"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiEndpoint]);

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setAccountMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setAccountMessage({ type: "error", text: "Email tidak boleh kosong" });
      return;
    }

    const payload: Record<string, string> = {
      email: trimmedEmail,
    };

    if (data.user.role === "siswa") {
      if (!idNumber.trim()) {
        setAccountMessage({ type: "error", text: "NISN tidak boleh kosong" });
        return;
      }
      payload.nisn = idNumber.trim();
      if (nisNumber.trim()) {
        payload.nis = nisNumber.trim();
      }
    } else if (data.user.role === "guru") {
      if (!loginUsername.trim()) {
        setAccountMessage({
          type: "error",
          text: "Username login tidak boleh kosong",
        });
        return;
      }
      payload.loginUsername = loginUsername.trim();
    } else if (data.user.role === "admin" && idNumber.trim()) {
      payload.nip = idNumber.trim();
    }

    setSavingAccount(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAccountMessage({
          type: "error",
          text: json.message || "Gagal memperbarui informasi akun",
        });
        return;
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                ...json.data,
              },
            }
          : null
      );
      setAccountMessage({
        type: "success",
        text: json.message || "Informasi akun berhasil diperbarui",
      });
    } catch {
      setAccountMessage({
        type: "error",
        text: "Terjadi kesalahan jaringan saat menyimpan perubahan",
      });
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Password saat ini wajib diisi",
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password baru minimal harus 6 karakter",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Konfirmasi password baru tidak cocok",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPasswordMessage({
          type: "error",
          text: json.message || "Gagal mengubah password",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "Password berhasil diperbarui",
      });
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Terjadi kesalahan jaringan saat mengubah password",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">
          Memuat profil pengguna...
        </p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 size-8 text-red-600" />
        <h2 className="text-sm font-bold text-red-900">Gagal Memuat Profil</h2>
        <p className="mt-1 text-xs text-red-600">
          {loadError || "Data profil tidak ditemukan"}
        </p>
        <button
          type="button"
          onClick={fetchProfile}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const { user, permissions } = data;
  const userRole = user.role;
  const isReadOnlyRole =
    permissions.isReadOnly ||
    userRole === "kurikulum" ||
    userRole === "kepsek";

  const displayName =
    userRole === "guru" && user.degree
      ? `${user.name}, ${user.degree}`
      : user.name;

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  const genderLabel =
    user.gender === "L"
      ? "Laki-laki"
      : user.gender === "P"
        ? "Perempuan"
        : "-";

  const joinYearText = user.joinYear
    ? String(user.joinYear)
    : user.tahunBergabung
      ? String(user.tahunBergabung)
      : user.joinDate
        ? formatDateID(user.joinDate)
        : formatDateID(user.createdAt);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* 1. Top Identity Banner Card */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-2xl font-extrabold text-white shadow-sm">
              {user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="size-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                  {ROLE_DISPLAY_NAMES[userRole] || userRole}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                    user.isActive !== false
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-red-50 text-red-700 border border-red-200/60"
                  }`}
                >
                  {user.isActive !== false ? "● Status Aktif" : "○ Nonaktif"}
                </span>
              </div>
              <h1 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900">
                {displayName}
              </h1>
              <p className="text-xs font-medium text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {userRole === "siswa" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  NISN / NIS
                </p>
                <p className="font-mono text-xs font-extrabold text-slate-800">
                  {user.nisn || user.nis || "-"}
                </p>
              </div>
            )}
            {(userRole === "guru" || userRole === "kurikulum") && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  Username Login
                </p>
                <p className="font-mono text-xs font-extrabold text-blue-900">
                  {user.loginUsername || "-"}
                </p>
              </div>
            )}
            {userRole !== "siswa" && user.nip && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  NIP
                </p>
                <p className="font-mono text-xs font-extrabold text-slate-800">
                  {user.nip}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Main Grid: Left (Read-Only Personal & Academic Biodata), Right (Account Settings or Read-Only Notice) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Personal & Academic Information (Strictly Read-Only for all roles) */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="size-4 text-blue-600" />
                  <span>Informasi Pribadi &amp; Akademik</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data identitas resmi yang terdaftar di pangkalan data sekolah.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                <Lock className="size-3" />
                <span>Hanya-Baca</span>
              </span>
            </div>

            {userRole === "siswa" && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <ReadOnlyField
                  icon={UserIcon}
                  label="Nama Lengkap"
                  value={user.name}
                />
                <ReadOnlyField
                  icon={Hash}
                  label="NISN / NIS"
                  value={
                    [
                      user.nisn ? `NISN: ${user.nisn}` : null,
                      user.nis ? `NIS: ${user.nis}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "-"
                  }
                />
                <ReadOnlyField
                  icon={Mail}
                  label="Email"
                  value={user.email}
                />
                <ReadOnlyField
                  icon={UserIcon}
                  label="Jenis Kelamin"
                  value={genderLabel}
                />
                <ReadOnlyField
                  icon={MapPin}
                  label="Tempat Lahir"
                  value={user.birthPlace || "-"}
                />
                <ReadOnlyField
                  icon={Calendar}
                  label="Tanggal Lahir"
                  value={formatDateID(user.birthDate)}
                />
                <ReadOnlyField
                  icon={Phone}
                  label="Nomor Telepon"
                  value={user.phone || "-"}
                />
                <ReadOnlyField
                  icon={GraduationCap}
                  label="Kelas / Rombel"
                  value={
                    user.classId?.name
                      ? `${user.classId.name}${
                          user.grade || user.classId.grade
                            ? ` (Tingkat ${user.grade || user.classId.grade})`
                            : ""
                        }`
                      : user.grade
                        ? `Tingkat ${user.grade}`
                        : "-"
                  }
                />
                <ReadOnlyField
                  icon={Building2}
                  label="Program Keahlian / Jurusan"
                  value={
                    user.departmentId?.name
                      ? `${user.departmentId.name}${
                          user.departmentId.code
                            ? ` (${user.departmentId.code})`
                            : ""
                        }`
                      : "-"
                  }
                />
                <ReadOnlyField
                  icon={Clock}
                  label="Tahun Ajaran"
                  value={
                    user.academicYear || user.classId?.academicYear || "2024/2025"
                  }
                />
              </div>
            )}

            {userRole === "guru" && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <ReadOnlyField
                  icon={UserIcon}
                  label="Nama Lengkap"
                  value={user.name}
                />
                <ReadOnlyField
                  icon={Hash}
                  label="NIP"
                  value={user.nip || "-"}
                />
                <ReadOnlyField
                  icon={KeyRound}
                  label="Username Login"
                  value={user.loginUsername || "-"}
                />
                <ReadOnlyField
                  icon={ShieldCheck}
                  label="Status Aktivasi Akun"
                  value={
                    user.isActivated !== false && !user.mustChangePassword
                      ? "Sudah Diaktivasi"
                      : "Belum Diaktivasi"
                  }
                />
                <ReadOnlyField
                  icon={Mail}
                  label="Email"
                  value={user.email}
                />
                <ReadOnlyField
                  icon={Award}
                  label="Gelar / Pendidikan Terakhir"
                  value={
                    [user.degree, user.lastEducation]
                      .filter(Boolean)
                      .join(" • ") || "-"
                  }
                />
                <ReadOnlyField
                  icon={MapPin}
                  label="Tempat Lahir"
                  value={user.birthPlace || "-"}
                />
                <ReadOnlyField
                  icon={Calendar}
                  label="Tanggal Lahir"
                  value={formatDateID(user.birthDate)}
                />
                <ReadOnlyField
                  icon={Phone}
                  label="Nomor Telepon"
                  value={user.phone || "-"}
                />
                <ReadOnlyField
                  icon={GraduationCap}
                  label="Wali Kelas"
                  value={
                    user.homeroomClassId?.name
                      ? `Wali Kelas ${user.homeroomClassId.name}`
                      : user.isHomeroomTeacher
                        ? "Wali Kelas"
                        : "Bukan Wali Kelas"
                  }
                />
                <ReadOnlyField
                  icon={BookOpen}
                  label="Mata Pelajaran Diampu"
                  value={
                    Array.isArray(user.subjects) && user.subjects.length > 0
                      ? user.subjects.join(", ")
                      : data.courses && data.courses.length > 0
                        ? Array.from(
                            new Set(
                              data.courses.map((c) => c.subjectName || c.name)
                            )
                          ).join(", ")
                        : "-"
                  }
                />
                <ReadOnlyField
                  icon={Clock}
                  label="Tahun / Tanggal Bergabung"
                  value={joinYearText}
                />
              </div>
            )}

            {(userRole === "admin" ||
              userRole === "kurikulum" ||
              userRole === "kepsek") && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <ReadOnlyField
                  icon={UserIcon}
                  label="Nama Lengkap"
                  value={user.name}
                />
                <ReadOnlyField
                  icon={Hash}
                  label="NIP / ID Pegawai"
                  value={user.nip || "-"}
                />
                {userRole === "kurikulum" && (
                  <>
                    <ReadOnlyField
                      icon={KeyRound}
                      label="Username Login"
                      value={user.loginUsername || "-"}
                    />
                    <ReadOnlyField
                      icon={ShieldCheck}
                      label="Status Aktivasi Akun"
                      value={
                        user.isActivated !== false && !user.mustChangePassword
                          ? "Sudah Diaktivasi"
                          : "Belum Diaktivasi"
                      }
                    />
                  </>
                )}
                <ReadOnlyField
                  icon={Mail}
                  label="Email"
                  value={user.email}
                />
                <ReadOnlyField
                  icon={Phone}
                  label="Nomor Telepon"
                  value={user.phone || "-"}
                />
                <ReadOnlyField
                  icon={ShieldCheck}
                  label="Peran Sistem"
                  value={ROLE_DISPLAY_NAMES[userRole] || userRole}
                />
                <ReadOnlyField
                  icon={Clock}
                  label="Terdaftar Sejak"
                  value={formatDateID(user.createdAt)}
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Editable Account Settings (for Siswa, Guru, Admin) OR Read-Only Notice (for Kurikulum, Kepsek) */}
        <div className="lg:col-span-5 space-y-6">
          {isReadOnlyRole ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-950">
                    Profil Hanya-Baca (Read-Only)
                  </h2>
                  <p className="text-xs text-amber-800">
                    Peran: {ROLE_DISPLAY_NAMES[userRole]}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-amber-900">
                Sesuai kebijakan hak akses Learnix LMS, informasi profil, email,
                nomor induk, dan kata sandi untuk akun{" "}
                <strong>{ROLE_DISPLAY_NAMES[userRole]}</strong> bersifat
                hanya-baca (read-only) dan tidak dapat diubah dari halaman ini.
              </p>
              <p className="text-[11px] text-amber-800">
                Apabila terdapat perubahan data kepegawaian atau kredensial akun,
                silakan hubungi Administrator Sistem.
              </p>
            </section>
          ) : (
            <>
              {/* Editable Card 1: Email & Identification Number */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="size-4 text-blue-600" />
                    <span>Pengaturan Informasi Akun</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Anda dapat memperbarui alamat email
                    {userRole === "siswa"
                      ? " dan NISN/NIS"
                      : userRole === "guru"
                        ? " dan username login"
                        : ""}{" "}
                    akun Anda. Biodata resmi (seperti Nama Lengkap dan NIP) hanya
                    dapat dikelola oleh Admin.
                  </p>
                </div>

                {accountMessage && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                      accountMessage.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {accountMessage.type === "success" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0 text-red-600" />
                    )}
                    <span>{accountMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="nama@sekolah.sch.id"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {userRole === "siswa" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          NISN
                        </label>
                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            required
                            placeholder="Masukkan NISN"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 font-mono text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          NIS
                        </label>
                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={nisNumber}
                            onChange={(e) => setNisNumber(e.target.value)}
                            placeholder="Masukkan NIS"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 font-mono text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {userRole === "guru" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">
                        Username Login
                      </label>
                      <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          required
                          placeholder="Contoh: ahmad.fauzan"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 font-mono text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Digunakan sebagai identitas login Anda (harus unik pada peran Guru).
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingAccount}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingAccount ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      <span>
                        {savingAccount
                          ? "Menyimpan..."
                          : "Simpan Perubahan Akun"}
                      </span>
                    </button>
                  </div>
                </form>
              </section>

              {/* Editable Card 2: Password Update */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="size-4 text-blue-600" />
                    <span>Ubah Password</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan password saat ini untuk mengganti kata sandi akun
                    Anda.
                  </p>
                </div>

                {passwordMessage && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                      passwordMessage.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {passwordMessage.type === "success" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0 text-red-600" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Password Saat Ini
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Masukkan password saat ini"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Password Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Minimal 6 karakter"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Ulangi password baru"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                    >
                      {savingPassword ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <KeyRound className="size-4" />
                      )}
                      <span>
                        {savingPassword ? "Memperbarui..." : "Perbarui Password"}
                      </span>
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
