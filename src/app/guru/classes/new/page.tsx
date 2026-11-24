"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  KeyRound,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Lock,
} from "lucide-react";

interface SubjectOption {
  _id: string;
  name: string;
  code: string;
}

interface RombelOption {
  _id: string;
  name: string;
  grade: string;
  studentCount?: number;
}

const BANNER_COLORS = [
  { id: "blue", label: "Biru Learnix", bg: "bg-[#2563eb]" },
  { id: "purple", label: "Ungu Akademik", bg: "bg-[#6d4ee9]" },
  { id: "green", label: "Hijau Emerald", bg: "bg-[#059669]" },
  { id: "orange", label: "Oranye Hangat", bg: "bg-[#d97706]" },
  { id: "gold", label: "Coklat Emas", bg: "bg-[#92400e]" },
];

export default function CreateNewClassPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [enrollmentMethod, setEnrollmentMethod] = useState<"rombel" | "invitation">("rombel");
  const [classRombelId, setClassRombelId] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [academicYear, setAcademicYear] = useState("2026/2027 - Ganjil");
  const [bannerColor, setBannerColor] = useState("blue");

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [rombels, setRombels] = useState<RombelOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClass, setCreatedClass] = useState<{
    _id: string;
    name: string;
    code?: string;
    password?: string;
    enrollmentMethod?: "rombel" | "invitation";
    classRombelId?: { _id: string; name: string };
  } | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch("/api/guru/options");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (Array.isArray(json.data.subjects)) {
              setSubjects(json.data.subjects);
            }
            if (Array.isArray(json.data.classes)) {
              setRombels(json.data.classes);
            }
          }
        }
      } catch {
        // silent fallback
      }
    }
    loadOptions();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama kelas wajib diisi.");
      return;
    }

    if (!classRombelId) {
      setError("Wajib memilih tepat 1 Rombel tujuan sebelum membuat Kelas Mapel.");
      return;
    }

    if (enrollmentMethod === "invitation" && !password.trim()) {
      setError("Password kelas wajib diisi untuk metode Kode Undangan.");
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
          subjectId: subjectId || undefined,
          enrollmentMethod,
          classRombelId,
          assignedRombelIds: [classRombelId],
          password: password.trim() || undefined,
          description: description.trim(),
          academicYear,
          bannerColor,
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
              {createdClass.enrollmentMethod === "rombel" ? (
                <>
                  Kelas <strong>{createdClass.name}</strong> telah terhubung secara permanen ke Rombel{" "}
                  <strong>{createdClass.classRombelId?.name || "Terpilih"}</strong> dan seluruh siswa aktif telah otomatis terdaftar.
                </>
              ) : (
                <>
                  Kelas <strong>{createdClass.name}</strong> telah terhubung secara permanen ke Rombel{" "}
                  <strong>{createdClass.classRombelId?.name || "Terpilih"}</strong>. Bagikan Kode Kelas dan Password di bawah ini kepada siswa rombel tersebut.
                </>
              )}
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
                  Password Kelas
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
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/guru/classes"
          className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Buat Kelas Mapel Baru
          </h1>
          <p className="text-xs text-slate-500">
            Setiap Kelas Mapel wajib ditetapkan ke 1 Rombel secara permanen
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">
            Nama Kelas Mapel <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pemrograman Web & Perangkat Bergerak - XII PPLG 1"
              required
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Nama Kelas Mapel tetap dapat diubah kapan saja setelah kelas dibuat.
          </p>
        </div>

        {/* MANDATORY ROMBEL ASSIGNMENT (Task 1) */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Pilih Rombel Tujuan (Wajib - Tepat 1 Rombel) <span className="text-rose-500">*</span>
            </label>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              <Lock className="size-3" />
              Permanen Setelah Dibuat
            </span>
          </div>
          <div className="relative">
            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-blue-600" />
            <select
              value={classRombelId}
              onChange={(e) => setClassRombelId(e.target.value)}
              required
              className="w-full rounded-xl border border-blue-300 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-[#0066FF] focus:outline-none"
            >
              <option value="">-- Pilih 1 Rombel Tujuan --</option>
              {rombels.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} (Tingkat {r.grade} • {r.studentCount ?? 0} Siswa)
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <strong>Penting:</strong> Rombel yang dipilih bersifat permanen dan tidak dapat diganti setelah Kelas Mapel dibuat.
          </p>
        </div>

        {/* Metode Pendaftaran Siswa */}
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-700">
            Metode Pendaftaran Siswa Rombel <span className="text-rose-500">*</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setEnrollmentMethod("rombel")}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                enrollmentMethod === "rombel"
                  ? "border-[#0066FF] bg-blue-50/70 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  enrollmentMethod === "rombel"
                    ? "bg-[#0066FF] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">
                  Otomatis Seluruh Siswa Rombel
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                  Seluruh siswa aktif pada rombel terpilih langsung terdaftar otomatis.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setEnrollmentMethod("invitation")}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                enrollmentMethod === "invitation"
                  ? "border-[#0066FF] bg-blue-50/70 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  enrollmentMethod === "invitation"
                    ? "bg-[#0066FF] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">
                  Mandiri via Kode Undangan & Password
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                  Siswa rombel bergabung menggunakan Kode Kelas & Password; Admin dapat memantau siswa yang belum bergabung.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Mata Pelajaran Referensi
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 focus:border-[#0066FF] focus:outline-none"
            >
              <option value="">-- Pilih Mata Pelajaran --</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Password Undangan Kelas{" "}
              {enrollmentMethod === "invitation" ? (
                <span className="text-rose-500">*</span>
              ) : (
                <span className="text-slate-400 font-normal">(Opsional)</span>
              )}
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contoh: pwpb123"
                required={enrollmentMethod === "invitation"}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Tahun Ajaran & Semester
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 focus:border-[#0066FF] focus:outline-none"
            >
              <option value="2026/2027 - Ganjil">2026/2027 - Ganjil</option>
              <option value="2026/2027 - Genap">2026/2027 - Genap</option>
              <option value="2025/2026 - Genap">2025/2026 - Genap</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Palette className="size-3.5 text-slate-500" />
              <span>Warna Banner Kelas</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {BANNER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setBannerColor(c.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    bannerColor === c.id
                      ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`size-3 rounded-full ${c.bg}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">
            Deskripsi Singkat Kelas (Opsional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan deskripsi mata pelajaran atau kompetensi dasar kelas ini..."
            className="w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <Link
            href="/guru/classes"
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0052cc] transition disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Menyimpan..." : "Buat Kelas Sekarang"}
          </button>
        </div>
      </form>
    </div>
  );
}
