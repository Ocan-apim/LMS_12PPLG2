"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ChevronRight,
} from "lucide-react";

interface RombelOption {
  _id: string;
  name: string;
  grade: string;
  studentCount?: number;
}

export default function CreateNewClassPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classRombelId, setClassRombelId] = useState("");
  const [password, setPassword] = useState("");

  const [rombels, setRombels] = useState<RombelOption[]>([]);
  const [loadingRombels, setLoadingRombels] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClass, setCreatedClass] = useState<{
    _id: string;
    name: string;
    code?: string;
    password?: string;
    classRombelId?: { _id: string; name: string };
  } | null>(null);

  useEffect(() => {
    async function loadRombels() {
      setLoadingRombels(true);
      try {
        const res = await fetch("/api/admin/classes");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setRombels(json.data);
          }
        }
      } catch {
        // silent fallback
      } finally {
        setLoadingRombels(false);
      }
    }
    loadRombels();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nama Kelas / Mapel wajib diisi.");
      return;
    }

    if (!classRombelId) {
      setError("Rombel Tujuan wajib dipilih (tepat 1 rombel).");
      return;
    }

    if (!password.trim()) {
      setError("Password Undangan wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/guru/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          classRombelId,
          assignedRombelIds: [classRombelId],
          password: password.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat kelas baru.");
      }

      setCreatedClass(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdClass) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm text-center space-y-5">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-9" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Kelas Berhasil Dibuat!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelas <strong>{createdClass.name}</strong> telah terhubung secara
              permanen ke Rombel{" "}
              <strong>{createdClass.classRombelId?.name || "Terpilih"}</strong>.
              Seluruh siswa aktif pada rombel tersebut otomatis mendapatkan
              akses, dan kode undangan di bawah tetap tersedia.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-left flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Rombel Terhubung (Permanen)
              </p>
              <p className="mt-0.5 text-base font-extrabold text-slate-900">
                {createdClass.classRombelId?.name || "Rombel Terpilih"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              <Lock className="size-3.5" />
              Terkunci
            </span>
          </div>

          {createdClass.code && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Kode Undangan Kelas
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-widest text-[#0066FF]">
                  {createdClass.code}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Password Undangan
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-slate-800">
                  {createdClass.password}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/guru/classes/${createdClass._id}`)}
              className="rounded-xl bg-[#0066FF] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0052cc] transition cursor-pointer"
            >
              Masuk ke Workspace Kelas
            </button>
            <Link
              href="/guru/classes"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Kembali ke Daftar Kelas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-16">
      {/* Breadcrumb matching Screenshot 1 */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-1"
      >
        <Link
          href="/guru/classes"
          className="hover:text-slate-600 transition"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-3.5 text-slate-300" />
        <span className="font-bold text-[#1355FF]">Tambah Kelas Baru</span>
      </nav>

      {/* Main Blue-to-Purple Gradient Container matching Screenshot 1 */}
      <div className="rounded-[24px] bg-gradient-to-b from-[#1356ff] via-[#2842f5] to-[#3f2be8] px-5 py-10 sm:px-10 sm:py-14 shadow-xl text-white">
        <div className="mx-auto max-w-[540px] space-y-7">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Buat Kelas Mapel
            </h1>
            <p className="mx-auto max-w-md text-xs sm:text-sm text-white/85 leading-relaxed">
              Buat kelas mata pelajaran untuk rombel tujuan beserta password
              undangan kelas
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-rose-300/40 bg-rose-500/20 px-4 py-3 text-xs font-semibold text-white backdrop-blur-xs"
            >
              <AlertCircle className="size-4 shrink-0 text-amber-300" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 1. Nama Kelas / Mapel */}
            <div>
              <label
                htmlFor="class-name"
                className="mb-2 block text-xs sm:text-sm font-bold text-white"
              >
                Nama Kelas / Mapel{" "}
                <span className="text-amber-400" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="class-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Contoh: Matematika, Basis Data"
                required
                aria-invalid={Boolean(error && !name.trim())}
                className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-white/70"
              />
            </div>

            {/* 2. Deskripsi Kelas (Opsional) */}
            <div>
              <label
                htmlFor="class-description"
                className="mb-2 block text-xs sm:text-sm font-bold text-white"
              >
                Deskripsi Kelas (Opsional)
              </label>
              <input
                id="class-description"
                name="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat mengenai mata pelajaran ini..."
                className="w-full rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/65 backdrop-blur-xs focus:border-white/60 focus:bg-white/20 focus:outline-none"
              />
            </div>

            {/* 3. Rombel Tujuan */}
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 space-y-2.5 backdrop-blur-xs">
              <label
                htmlFor="class-rombel"
                className="block text-xs font-extrabold uppercase tracking-wider text-white"
              >
                Pilih Rombel Tujuan (1 Rombel){" "}
                <span className="text-amber-400" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="class-rombel"
                name="classRombelId"
                value={classRombelId}
                onChange={(e) => {
                  setClassRombelId(e.target.value);
                  if (error) setError(null);
                }}
                required
                aria-invalid={Boolean(error && !classRombelId)}
                aria-describedby="rombel-help"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <option value="">
                  {loadingRombels
                    ? "Memuat daftar rombel..."
                    : "-- Pilih Satu Rombel --"}
                </option>
                {rombels.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} (Tingkat {r.grade} • {r.studentCount ?? 0} Siswa)
                  </option>
                ))}
              </select>
              <p
                id="rombel-help"
                className="text-[11px] text-white/80 leading-relaxed"
              >
                Seluruh siswa aktif yang terdaftar di rombel terpilih akan
                langsung mendapatkan akses ke kelas ini di menu{" "}
                <strong className="text-white">Mata Pelajaran</strong> mereka.
                Penetapan rombel bersifat permanen dan tidak dapat diubah.
              </p>
            </div>

            {/* 4. Password Undangan */}
            <div>
              <label
                htmlFor="class-password"
                className="mb-2 block text-xs sm:text-sm font-bold text-white"
              >
                Password Undangan{" "}
                <span className="text-amber-400" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="class-password"
                name="password"
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masukkan password undangan kelas..."
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(error && !password.trim())}
                aria-describedby="password-help"
                className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-white/70"
              />
              <p
                id="password-help"
                className="mt-1.5 text-[11px] text-white/75"
              >
                Kode undangan dibuat otomatis oleh sistem dan digunakan bersama
                password ini.
              </p>
            </div>

            {/* Submit Button matching Screenshot 1 */}
            <div className="pt-3 flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-bold text-[#1355FF] shadow-md hover:bg-blue-50 transition disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>＋ Buat Kelas</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
