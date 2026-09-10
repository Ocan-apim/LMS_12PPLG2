"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  GraduationCap,
  Info,
  ArrowLeft,
  AlertCircle,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui";

interface DeptOption {
  _id: string;
  name: string;
  code: string;
}

interface ClassOption {
  _id: string;
  name: string;
  grade: string;
  departmentId?: { _id: string; code: string };
}

export default function TambahSiswaBaruPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [nis, setNis] = useState("");
  const [nisn, setNisn] = useState("");
  const [gender, setGender] = useState<"Laki-laki" | "Perempuan">("Laki-laki");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [grade, setGrade] = useState<"10" | "11" | "12">("10");
  const [departmentCode, setDepartmentCode] = useState("PPLG");
  const [academicYear, setAcademicYear] = useState("2024/2025 - Genap");
  const [classId, setClassId] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const [deptRes, classRes] = await Promise.all([
          fetch("/api/admin/departments"),
          fetch("/api/admin/classes"),
        ]);
        const [deptJson, classJson] = await Promise.all([
          deptRes.json(),
          classRes.json(),
        ]);
        if (deptJson.success) setDepartments(deptJson.data);
        if (classJson.success) setClasses(classJson.data);
      } catch (err) {
        console.error("Gagal memuat opsi:", err);
      }
    }
    loadOptions();
  }, []);

  // Filter available classes based on chosen grade & department
  const selectedDept = departments.find((d) => d.code === departmentCode);
  const filteredClasses = classes.filter((c) => {
    const matchGrade = c.grade === grade;
    const matchDept = selectedDept ? c.name.includes(selectedDept.code) : true;
    return matchGrade && matchDept;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama lengkap sesuai ijazah wajib diisi");
      return;
    }
    const cleanNis = nis.trim();
    const cleanNisn = nisn.trim();
    if (!cleanNis && !cleanNisn) {
      setError("Nomor Induk Siswa (NIS) atau NISN wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nis: cleanNis || cleanNisn,
          nisn: cleanNisn || cleanNis,
          gender,
          birthPlace: birthPlace.trim(),
          birthDate: birthDate || undefined,
          grade,
          departmentId: selectedDept?._id,
          classId: classId || undefined,
          academicYear,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal menyimpan data siswa");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/admin/students");
        }, 1200);
      }
    } catch {
      setError("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb & Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/admin/students" className="hover:text-blue-600 transition flex items-center gap-1">
            <ArrowLeft className="size-3" /> Student Management
          </Link>
          <span>/</span>
          <span className="text-blue-600">Tambah Siswa Baru</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Registrasi Siswa Baru</h1>
        <p className="text-sm text-slate-500">
          Lengkapi formulir di bawah ini untuk mendaftarkan siswa ke dalam sistem Learnix.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>Data siswa berhasil disimpan! Mengalihkan...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: The Cards matching Image 1 Bottom-Right */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Data Pribadi Siswa */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              <User className="size-4 text-blue-600" />
              <span>Data Pribadi Siswa</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Sesuai Ijazah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ahmad Bagus Pratama"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIS (Untuk Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 24769233"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NISN (10 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 0098273645"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "Laki-laki" | "Perempuan")}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Yogyakarta"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Data Akademik */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              <GraduationCap className="size-4 text-blue-600" />
              <span>Data Akademik</span>
            </div>

            <div className="space-y-5">
              {/* Tingkat Kelas Toggles */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tingkat Kelas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["10", "11", "12"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGrade(g);
                        setClassId("");
                      }}
                      className={`rounded-lg py-2 text-sm font-semibold transition ${
                        grade === g
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Kelas {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tahun Ajaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="2024/2025 - Genap">2024/2025 - Genap</option>
                  <option value="2024/2025 - Ganjil">2024/2025 - Ganjil</option>
                  <option value="2023/2024 - Genap">2023/2024 - Genap</option>
                </select>
              </div>

              {/* Pilih Jurusan / Peminatan matching Image 1 Bottom-Right */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilih Jurusan / Peminatan SMK
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: "PPLG", label: "PPLG" },
                    { code: "TJKT", label: "TJKT" },
                    { code: "DKV", label: "DKV" },
                    { code: "MPLB", label: "MPLB" },
                    { code: "Perhotelan", label: "Perhotelan" },
                    { code: "BDR", label: "BDR / PM" },
                  ].map((j) => (
                    <button
                      key={j.code}
                      type="button"
                      onClick={() => {
                        setDepartmentCode(j.code);
                        setClassId("");
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        departmentCode === j.code
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`size-2 rounded-full ${departmentCode === j.code ? "bg-white" : "bg-slate-300"}`} />
                      {j.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih Kelas Rombel */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Rombel Kelas
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Kelas Rombel ({grade} {departmentCode}) --</option>
                  {filteredClasses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {filteredClasses.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Belum ada kelas rombel untuk Kelas {grade} jurusan {departmentCode}. Buat kelas di Manajemen Kelas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Action Buttons & Official Kemendikbud Note matching Image 1 */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-xs"
              leftIcon={<Save className="size-4" />}
            >
              {submitting ? "Menyimpan..." : "Simpan Data Siswa"}
            </Button>
            <Link
              href="/admin/students"
              className="block w-full text-center rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal & Kembali
            </Link>
          </div>

          {/* Official Kemendikbud Note Alert matching Image 1 */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Info className="size-3" />
              </div>
              <p>
                <strong>Pastikan NISN</strong> yang dimasukkan sesuai dengan data resmi dari Kemendikbud untuk menghindari duplikasi data dan memastikan sinkronisasi data rapor.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
