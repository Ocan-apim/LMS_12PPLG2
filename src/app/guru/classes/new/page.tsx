"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Check,
  Copy,
  ChevronRight,
  Users,
  KeyRound,
  GraduationCap,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface RombelOption {
  _id: string;
  name: string;
  grade: string;
  studentCount?: number;
}

type EnrollmentMethodOption = "rombel" | "invitation";

export default function BuatKelasMapelPage() {
  const router = useRouter();

  const [rombels, setRombels] = useState<RombelOption[]>([]);
  const [loadingRombels, setLoadingRombels] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentMethod, setEnrollmentMethod] =
    useState<EnrollmentMethodOption>("rombel");
  const [selectedRombelId, setSelectedRombelId] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [createdClass, setCreatedClass] = useState<{
    _id: string;
    name: string;
    enrollmentMethod: EnrollmentMethodOption;
    code?: string;
    password?: string;
    rombelName?: string;
    studentCount?: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRombels() {
      try {
        setLoadingRombels(true);
        const res = await fetch("/api/admin/classes");
        const json = await res.json();
        if (!active) return;
        if (json.success && Array.isArray(json.data)) {
          setRombels(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat rombel:", err);
      } finally {
        if (active) setLoadingRombels(false);
      }
    }
    loadRombels();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama kelas / mapel wajib diisi");
      return;
    }

    if (enrollmentMethod === "rombel") {
      if (!selectedRombelId) {
        setError("Silakan pilih satu rombel tujuan");
        return;
      }
    } else {
      if (!password.trim()) {
        setError("Password kelas wajib diisi untuk metode Kode Undangan");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload =
        enrollmentMethod === "rombel"
          ? {
              name: name.trim(),
              description: description.trim() || undefined,
              enrollmentMethod: "rombel" as const,
              classRombelId: selectedRombelId,
            }
          : {
              name: name.trim(),
              description: description.trim() || undefined,
              enrollmentMethod: "invitation" as const,
              password: password.trim(),
            };

      const res = await fetch("/api/guru/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Gagal membuat kelas");
      } else {
        const classData = json.data;
        const matchedRombel = rombels.find((r) => r._id === selectedRombelId);
        setCreatedClass({
          _id: classData._id,
          name: classData.name,
          enrollmentMethod,
          code: classData.code,
          password: password.trim(),
          rombelName:
            classData.classRombelId?.name || matchedRombel?.name || undefined,
          studentCount:
            typeof classData.studentCount === "number"
              ? classData.studentCount
              : Array.isArray(classData.studentIds)
                ? classData.studentIds.length
                : 0,
        });
      }
    } catch {
      setError("Terjadi kesalahan sistem saat membuat kelas");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!createdClass || createdClass.enrollmentMethod === "rombel") return;
    const text = `Kelas: ${createdClass.name}\nKode Kelas: ${createdClass.code}\nPassword: ${createdClass.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link href="/guru" className="hover:text-blue-600 transition">
          Dashboard
        </Link>
        <ChevronRight className="size-3 text-slate-300" />
        <span className="text-blue-600 font-semibold">Tambah Kelas Baru</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          <AlertCircle className="size-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {!createdClass ? (
        /* Blue Gradient Card */
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-blue-600 to-indigo-700 p-6 sm:p-12 text-white shadow-xl">
          <div className="mx-auto max-w-lg text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Buat Kelas Mapel
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 font-medium">
              Pilih metode pendaftaran siswa melalui Assign ke Rombel atau Kode
              Undangan
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 max-w-lg space-y-5"
          >
            {/* Nama Kelas / Mapel */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Nama Kelas / Mapel <span className="text-amber-300">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Matematika, Basis Data"
                required
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Deskripsi Kelas (Opsional) */}
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1.5">
                Deskripsi Kelas (Opsional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat mengenai mata pelajaran ini..."
                className="w-full rounded-xl bg-white/15 px-4 py-2.5 text-xs text-white placeholder-blue-200 border border-white/20 focus:outline-none focus:bg-white/25"
              />
            </div>

            {/* Metode Pendaftaran Siswa */}
            <div className="space-y-3 pt-1">
              <label className="block text-sm font-bold text-white">
                Metode Pendaftaran Siswa
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Option A: Assign ke Rombel */}
                <button
                  type="button"
                  onClick={() => {
                    setEnrollmentMethod("rombel");
                    setError("");
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition cursor-pointer ${
                    enrollmentMethod === "rombel"
                      ? "border-white bg-white text-blue-900 shadow-lg"
                      : "border-white/25 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${
                        enrollmentMethod === "rombel"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-white/15 text-white"
                      }`}
                    >
                      <Users className="size-4.5" />
                    </span>
                    <span
                      className={`size-4 rounded-full border-2 flex items-center justify-center ${
                        enrollmentMethod === "rombel"
                          ? "border-blue-600 bg-blue-600"
                          : "border-white/60"
                      }`}
                    >
                      {enrollmentMethod === "rombel" && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <span className="mt-3 text-sm font-extrabold">
                    Assign ke Rombel
                  </span>
                  <span
                    className={`mt-1 text-[11px] leading-relaxed ${
                      enrollmentMethod === "rombel"
                        ? "text-slate-600"
                        : "text-blue-100/85"
                    }`}
                  >
                    Daftarkan seluruh siswa aktif dari 1 rombel secara otomatis.
                  </span>
                </button>

                {/* Option B: Kode Undangan */}
                <button
                  type="button"
                  onClick={() => {
                    setEnrollmentMethod("invitation");
                    setError("");
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition cursor-pointer ${
                    enrollmentMethod === "invitation"
                      ? "border-white bg-white text-blue-900 shadow-lg"
                      : "border-white/25 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${
                        enrollmentMethod === "invitation"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-white/15 text-white"
                      }`}
                    >
                      <KeyRound className="size-4.5" />
                    </span>
                    <span
                      className={`size-4 rounded-full border-2 flex items-center justify-center ${
                        enrollmentMethod === "invitation"
                          ? "border-blue-600 bg-blue-600"
                          : "border-white/60"
                      }`}
                    >
                      {enrollmentMethod === "invitation" && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <span className="mt-3 text-sm font-extrabold">
                    Kode Undangan
                  </span>
                  <span
                    className={`mt-1 text-[11px] leading-relaxed ${
                      enrollmentMethod === "invitation"
                        ? "text-slate-600"
                        : "text-blue-100/85"
                    }`}
                  >
                    Siswa bergabung manual menggunakan kode kelas &amp; password.
                  </span>
                </button>
              </div>
            </div>

            {/* Dynamic Fields Based on Selected Enrollment Method */}
            {enrollmentMethod === "rombel" ? (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 space-y-2.5">
                <label
                  htmlFor="select-rombel"
                  className="block text-xs font-bold uppercase tracking-wider text-white"
                >
                  Pilih Rombel Tujuan (1 Rombel){" "}
                  <span className="text-amber-300">*</span>
                </label>

                {loadingRombels ? (
                  <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-xs text-blue-100">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Memuat daftar rombel aktif...</span>
                  </div>
                ) : rombels.length === 0 ? (
                  <div className="rounded-xl border border-amber-300/40 bg-amber-500/20 p-3 text-xs text-amber-100">
                    Belum ada rombel aktif yang tersedia di sistem. Silakan
                    gunakan metode Kode Undangan atau hubungi Admin.
                  </div>
                ) : (
                  <select
                    id="select-rombel"
                    value={selectedRombelId}
                    onChange={(e) => setSelectedRombelId(e.target.value)}
                    required
                    className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">-- Pilih Satu Rombel --</option>
                    {rombels.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} (Tingkat {r.grade}
                        {typeof r.studentCount === "number"
                          ? ` • ${r.studentCount} Siswa`
                          : ""}
                        )
                      </option>
                    ))}
                  </select>
                )}

                <p className="text-[11px] text-blue-100/85 leading-relaxed">
                  Seluruh siswa aktif yang terdaftar di rombel terpilih akan
                  langsung mendapatkan akses ke kelas ini di menu{" "}
                  <strong>Mata Pelajaran</strong> mereka tanpa memerlukan kode
                  undangan atau password.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-white">
                  Password Kelas <span className="text-amber-300">*</span>
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buatlah password kelas"
                  required
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <p className="text-[11px] text-blue-100/85 leading-relaxed">
                  Kode Kelas 5 karakter akan di-generate otomatis oleh sistem.
                  Anda dapat membagikan Kode Kelas dan Password ini kepada siswa
                  untuk bergabung melalui menu <strong>Join Kelas Baru</strong>.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={
                  submitting ||
                  (enrollmentMethod === "rombel" &&
                    (loadingRombels || rombels.length === 0))
                }
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-bold text-blue-600 shadow-md hover:bg-blue-50 transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="size-4 text-blue-600" />
                <span>{submitting ? "Memproses..." : "Buat Kelas"}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Success State */
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-md max-w-md mx-auto space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="size-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Kelas Berhasil Dibuat!
          </h2>

          {createdClass.enrollmentMethod === "rombel" ? (
            <>
              <p className="text-xs text-slate-500">
                Seluruh siswa aktif pada rombel terpilih telah otomatis
                terdaftar ke kelas ini.
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-left text-xs">
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Nama Kelas:</span>
                  <strong className="text-slate-900">
                    {createdClass.name}
                  </strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Metode Pendaftaran:</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                    <GraduationCap className="size-3" />
                    Assign ke Rombel
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Rombel Terdaftar:</span>
                  <strong className="text-slate-900">
                    {createdClass.rombelName || "-"}
                  </strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Siswa Terdaftar:</span>
                  <strong className="text-emerald-700">
                    {createdClass.studentCount ?? 0} Siswa Aktif
                  </strong>
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/guru/classes/${createdClass._id}`)
                  }
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                >
                  Buka Kelas
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Bagikan kode kelas dan password berikut kepada siswa Anda.
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-left text-xs">
                <p>
                  <span className="text-slate-500">Nama Kelas:</span>{" "}
                  <strong className="text-slate-900">
                    {createdClass.name}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Kode Kelas:</span>{" "}
                  <strong className="font-mono text-blue-600 text-sm">
                    {createdClass.code}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Password:</span>{" "}
                  <strong className="font-mono text-slate-900">
                    {createdClass.password}
                  </strong>
                </p>
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>{copied ? "Tersalin!" : "Salin Kode"}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/guru/classes/${createdClass._id}`)
                  }
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Buka Kelas
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
