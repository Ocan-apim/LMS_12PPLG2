"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Lock,
  Camera,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  GraduationCap,
  Bell,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface StudentAccountInfo {
  _id: string;
  name: string;
  email: string;
  nisn?: string;
  nis?: string;
  grade?: string;
  className?: string;
  role: string;
  photoUrl?: string;
  birthPlace?: string;
  birthDate?: string;
}

export function StudentSettings() {
  const [account, setAccount] = useState<StudentAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Email form state
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Notification Preferences (client preferences)
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyQuizzes, setNotifyQuizzes] = useState(true);
  const [notifyGrades, setNotifyGrades] = useState(true);
  const [notifyDeadlines, setNotifyDeadlines] = useState(true);
  const [notifSaved, setNotifSaved] = useState(false);

  async function loadAccount() {
    try {
      setLoading(true);
      const res = await fetch("/api/siswa/profile");
      const json = await res.json();
      if (json.success && json.data?.user) {
        const u = json.data.user;
        setAccount({
          _id: u._id,
          name: u.name,
          email: u.email,
          nisn: u.nisn,
          nis: u.nis,
          grade: u.grade,
          className: u.classId?.name,
          role: u.role,
          photoUrl: u.photoUrl,
          birthPlace: u.birthPlace,
          birthDate: u.birthDate,
        });
        setNewEmail(u.email || "");
      }
    } catch {
      console.error("Gagal memuat info akun siswa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load saved preferences if available
    try {
      const savedPrefs = localStorage.getItem("learnix_siswa_notif_prefs");
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (typeof parsed.assignments === "boolean") setNotifyAssignments(parsed.assignments);
        if (typeof parsed.quizzes === "boolean") setNotifyQuizzes(parsed.quizzes);
        if (typeof parsed.grades === "boolean") setNotifyGrades(parsed.grades);
        if (typeof parsed.deadlines === "boolean") setNotifyDeadlines(parsed.deadlines);
      }
    } catch {
      // ignore
    }

    loadAccount();
  }, []);

  // Update Email
  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setEmailStatus({ type: "error", message: "Alamat email tidak boleh kosong" });
      return;
    }
    if (emailTrimmed === account?.email) {
      setEmailStatus({ type: "error", message: "Email baru sama dengan email saat ini" });
      return;
    }

    try {
      setSavingEmail(true);
      const res = await fetch("/api/siswa/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });
      const json = await res.json();

      if (json.success) {
        setAccount((prev) => (prev ? { ...prev, email: emailTrimmed } : null));
        setEmailStatus({ type: "success", message: "Email berhasil diperbarui" });
      } else {
        setEmailStatus({ type: "error", message: json.message || "Gagal memperbarui email" });
      }
    } catch {
      setEmailStatus({ type: "error", message: "Terjadi kesalahan jaringan saat memperbarui email" });
    } finally {
      setSavingEmail(false);
    }
  }

  // Update Password
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ type: "error", message: "Password saat ini wajib diisi" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "Password baru minimal 6 karakter" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Konfirmasi password baru tidak cocok" });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await fetch("/api/siswa/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          password: newPassword,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setPasswordStatus({ type: "success", message: "Password akun berhasil diperbarui" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({ type: "error", message: json.message || "Gagal memperbarui password" });
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Terjadi kesalahan jaringan saat mengubah password" });
    } finally {
      setSavingPassword(false);
    }
  }

  // Handle Photo Upload
  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarStatus({ type: "error", message: "File harus berupa format gambar (JPG, PNG, WebP)" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus({ type: "error", message: "Ukuran gambar foto profil maksimal 5MB" });
      return;
    }

    try {
      setUploadingAvatar(true);
      setAvatarStatus(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "avatars");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();

      if (!uploadJson.success || !uploadJson.data?.url) {
        throw new Error(uploadJson.message || "Gagal mengunggah foto");
      }

      const photoUrl = uploadJson.data.url;

      const patchRes = await fetch("/api/siswa/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      const patchJson = await patchRes.json();

      if (patchJson.success) {
        setAccount((prev) => (prev ? { ...prev, photoUrl } : null));
        setAvatarStatus({ type: "success", message: "Foto profil berhasil diperbarui" });
      } else {
        throw new Error(patchJson.message || "Gagal menyimpan foto profil");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto profil";
      setAvatarStatus({ type: "error", message: msg });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Remove Photo
  async function handleRemoveAvatar() {
    if (!account?.photoUrl) return;

    try {
      setUploadingAvatar(true);
      setAvatarStatus(null);

      const res = await fetch("/api/siswa/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: "" }),
      });
      const json = await res.json();

      if (json.success) {
        setAccount((prev) => (prev ? { ...prev, photoUrl: "" } : null));
        setAvatarStatus({ type: "success", message: "Foto profil berhasil dihapus" });
      } else {
        setAvatarStatus({ type: "error", message: json.message || "Gagal menghapus foto" });
      }
    } catch {
      setAvatarStatus({ type: "error", message: "Terjadi kesalahan saat menghapus foto profil" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Save Notification Preferences
  function handleSaveNotifPrefs(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(
        "learnix_siswa_notif_prefs",
        JSON.stringify({
          assignments: notifyAssignments,
          quizzes: notifyQuizzes,
          grades: notifyGrades,
          deadlines: notifyDeadlines,
        })
      );
    } catch {
      // ignore
    }
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Akun Siswa</h1>
        <p className="text-xs text-slate-500 mt-1">
          Kelola informasi keamanan akun Anda, email, dan foto profil siswa di Learnix LMS.
        </p>
      </div>

      {/* SECTION 1: FOTO PROFIL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <Camera className="size-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Foto Profil</h2>
            <p className="text-xs text-slate-400">
              Foto ini akan ditampilkan pada tugas, pengumpulan, dan profil kelas Anda
            </p>
          </div>
        </div>

        {avatarStatus && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              avatarStatus.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {avatarStatus.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
            )}
            <span>{avatarStatus.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
          <div className="relative group">
            <div className="size-20 rounded-full border-2 border-slate-200 overflow-hidden bg-blue-50 flex items-center justify-center text-xl font-bold text-blue-600 shadow-xs">
              {account?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.photoUrl}
                  alt={account.name}
                  className="size-full object-cover"
                />
              ) : (
                account?.name?.charAt(0).toUpperCase() || "S"
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Camera className="size-3.5 mr-1.5" />
                {account?.photoUrl ? "Ganti Foto" : "Unggah Foto Baru"}
              </Button>
              {account?.photoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={handleRemoveAvatar}
                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Hapus
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Format yang didukung: JPG, PNG, atau WebP. Ukuran maksimum 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: ALAMAT EMAIL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <Mail className="size-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Alamat Email</h2>
            <p className="text-xs text-slate-400">
              Alamat email utama yang digunakan untuk login dan notifikasi akademik
            </p>
          </div>
        </div>

        {emailStatus && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              emailStatus.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {emailStatus.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
            )}
            <span>{emailStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleUpdateEmail} className="space-y-4 pt-1 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Saat Ini
            </label>
            <input
              type="text"
              readOnly
              value={account?.email || ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Email Baru
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nama@learnix.sch.id"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={savingEmail || newEmail.trim() === account?.email}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              <Save className="size-3.5 mr-1.5" />
              {savingEmail ? "Menyimpan..." : "Simpan Email Baru"}
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION 3: UBAH PASSWORD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <KeyRound className="size-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Ubah Password Akun</h2>
            <p className="text-xs text-slate-400">
              Perbarui kata sandi akun siswa Anda untuk menjaga keamanan akses
            </p>
          </div>
        </div>

        {passwordStatus && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              passwordStatus.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {passwordStatus.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
            )}
            <span>{passwordStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Saat Ini <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan password yang saat ini aktif"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Konfirmasi Password Baru <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              <Lock className="size-3.5 mr-1.5" />
              {savingPassword ? "Memperbarui..." : "Perbarui Password"}
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION 4: DATA IDENTITAS (READ-ONLY) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <User className="size-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Data Identitas Resmi Siswa</h2>
              <p className="text-xs text-slate-400">
                Informasi identitas resmi yang terdaftar pada sistem Dapodik / Admin Sekolah
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            Hanya Baca
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-800">
          <ShieldAlert className="size-4 shrink-0 text-amber-600" />
          <span>
            Data identitas resmi (nama lengkap, NIS/NISN, tanggal lahir, dan rombel kelas) hanya dapat diubah oleh Administrator Sekolah demi integritas pelaporan nilai & rapor.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Nama Lengkap
            </span>
            <p className="text-xs font-bold text-slate-900">{account?.name || "-"}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              NISN / NIS
            </span>
            <p className="text-xs font-bold text-slate-900 font-mono">
              {account?.nisn ? `NISN. ${account.nisn}` : account?.nis ? `NIS. ${account.nis}` : "-"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Kelas / Rombel
            </span>
            <p className="text-xs font-bold text-slate-900">
              {account?.className ? `${account.className} (${account.grade ? `Tingkat ${account.grade}` : ""})` : "-"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Peran Akun
            </span>
            <p className="text-xs font-bold text-slate-900 capitalize">{account?.role || "Siswa"}</p>
          </div>
        </div>
      </div>

      {/* SECTION 5: NOTIFIKASI PEMBELAJARAN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <Bell className="size-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Preferensi Notifikasi Pembelajaran</h2>
            <p className="text-xs text-slate-400">Atur pemberitahuan untuk aktivitas belajar Anda</p>
          </div>
        </div>

        {notifSaved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Preferensi notifikasi berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSaveNotifPrefs} className="space-y-3 pt-1">
          <label className="flex items-center justify-between cursor-pointer rounded-xl p-2 hover:bg-slate-50 transition">
            <div>
              <p className="text-xs font-semibold text-slate-800">Tugas Baru</p>
              <p className="text-[11px] text-slate-400">Terima notifikasi saat guru mempublikasikan tugas baru</p>
            </div>
            <input
              type="checkbox"
              checked={notifyAssignments}
              onChange={(e) => setNotifyAssignments(e.target.checked)}
              className="size-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer rounded-xl p-2 hover:bg-slate-50 transition">
            <div>
              <p className="text-xs font-semibold text-slate-800">Kuis Baru</p>
              <p className="text-[11px] text-slate-400">Pemberitahuan ketika ada kuis atau ulangan harian yang dibuka</p>
            </div>
            <input
              type="checkbox"
              checked={notifyQuizzes}
              onChange={(e) => setNotifyQuizzes(e.target.checked)}
              className="size-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer rounded-xl p-2 hover:bg-slate-50 transition">
            <div>
              <p className="text-xs font-semibold text-slate-800">Nilai & Evaluasi Guru</p>
              <p className="text-[11px] text-slate-400">Pemberitahuan ketika guru telah menilai tugas Anda</p>
            </div>
            <input
              type="checkbox"
              checked={notifyGrades}
              onChange={(e) => setNotifyGrades(e.target.checked)}
              className="size-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              Simpan Preferensi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
