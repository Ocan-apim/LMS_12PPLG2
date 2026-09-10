"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  BookOpen,
  Camera,
  Briefcase,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui";

interface SubjectOption {
  _id: string;
  name: string;
  code: string;
}

interface ClassOption {
  _id: string;
  name: string;
}

export default function TambahGuruBaruPage() {
  const router = useRouter();

  const [subjectsList, setSubjectsList] = useState<SubjectOption[]>([]);
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [nip, setNip] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [lastEducation, setLastEducation] = useState("S1 / Sarjana");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClassId, setHomeroomClassId] = useState("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    async function loadData() {
      try {
        const [subRes, classRes] = await Promise.all([
          fetch("/api/admin/subjects"),
          fetch("/api/admin/classes"),
        ]);
        const [subJson, classJson] = await Promise.all([
          subRes.json(),
          classRes.json(),
        ]);
        if (subJson.success) setSubjectsList(subJson.data);
        if (classJson.success) setClassesList(classJson.data);
      } catch (err) {
        console.error("Gagal memuat data pendukung:", err);
      }
    }
    loadData();
  }, []);

  function toggleSubject(subId: string) {
    if (selectedSubjects.includes(subId)) {
      setSelectedSubjects(selectedSubjects.filter((id) => id !== subId));
    } else {
      setSelectedSubjects([...selectedSubjects, subId]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }
    if (!email.trim()) {
      setError("Alamat email institusi wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          degree: degree.trim() || undefined,
          nip: nip.trim() || undefined,
          email: email.trim().toLowerCase(),
          password: password.trim() || "guru12345",
          lastEducation,
          subjects: selectedSubjects,
          isHomeroomTeacher,
          homeroomClassId: isHomeroomTeacher && homeroomClassId ? homeroomClassId : undefined,
          joinDate,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal menambahkan guru");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/admin/teachers");
        }, 1200);
      }
    } catch {
      setError("Terjadi kesalahan sistem saat menyimpan guru");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header matching Image 2 Top-Right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/admin/teachers" className="hover:text-blue-600 transition flex items-center gap-1">
              <ArrowLeft className="size-3" /> Teacher Management
            </Link>
            <span>/</span>
            <span className="text-blue-600">Tambah Guru Baru</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Tambah Guru Baru</h1>
          <p className="text-sm text-slate-500">
            Lengkapi informasi di bawah ini untuk mendaftarkan tenaga pengajar baru ke dalam sistem.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/teachers"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-xs"
          >
            Batal
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 shadow-xs"
          >
            {submitting ? "Menyimpan..." : "Simpan Data"}
          </Button>
        </div>
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
          <span>Data guru berhasil disimpan! Mengalihkan...</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Informasi Personal & Kualifikasi Akademik */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Informasi Personal */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              <User className="size-4 text-blue-600" />
              <span>Informasi Personal</span>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap (Sesuai Ijazah) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Dra. Rina Sulistiawati"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gelar Akademik
                  </label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="Contoh: M.Pd., S.T."
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Induk Pegawai (NIP)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 19820512 200501 2 003"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email Institusi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: rina.s@sekolah.sch.id"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Awal Akun
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 font-mono focus:border-blue-500 focus:outline-hidden"
                />
                <p className="mt-1 text-[11px] text-slate-400">Guru dapat mengubah password saat pertama kali login.</p>
              </div>
            </div>
          </div>

          {/* Card 3: Kualifikasi Akademik matching Image 2 Top-Right */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              <BookOpen className="size-4 text-blue-600" />
              <span>Kualifikasi Akademik</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  PENDIDIKAN TERAKHIR
                </label>
                <div className="flex flex-wrap gap-2">
                  {["D3", "S1 / Sarjana", "S2 / Magister", "S3 / Doktoral", "Lainnya"].map((edu) => (
                    <button
                      key={edu}
                      type="button"
                      onClick={() => setLastEducation(edu)}
                      className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                        lastEducation === edu
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {edu}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  MATA PELAJARAN YANG DIAMPU
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjectsList.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub._id);
                    return (
                      <button
                        key={sub._id}
                        type="button"
                        onClick={() => toggleSubject(sub._id)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{sub.name}</span>
                        {isSelected ? (
                          <X className="size-3" />
                        ) : (
                          <Plus className="size-3 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Pilih satu atau lebih mata pelajaran utama dan pendukung yang diajarkan oleh guru ini.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Foto Profil & Status Kepegawaian matching Image 2 Top-Right */}
        <div className="space-y-6">
          {/* Foto Profil */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs text-center">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Foto Profil
            </div>
            <div className="mx-auto flex size-28 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer">
              <div className="text-center">
                <Camera className="mx-auto size-7 text-slate-400" />
                <span className="mt-1 block text-[11px] font-semibold text-slate-600">Upload Foto</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Format: JPG, PNG (Maks. 2MB). Disarankan latar belakang polos.
            </p>
          </div>

          {/* Status Kepegawaian */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-3 border-b border-slate-100">
              <Briefcase className="size-4 text-blue-600" />
              <span>Status Kepegawaian</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Bergabung
              </label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Ditugaskan sebagai Wali Kelas?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsHomeroomTeacher(true)}
                  className={`rounded-lg py-2 text-xs font-bold transition ${
                    isHomeroomTeacher
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  YA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHomeroomTeacher(false);
                    setHomeroomClassId("");
                  }}
                  className={`rounded-lg py-2 text-xs font-bold transition ${
                    !isHomeroomTeacher
                      ? "bg-slate-600 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  TIDAK
                </button>
              </div>
            </div>

            {isHomeroomTeacher && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Kelas yang Diampu
                </label>
                <select
                  value={homeroomClassId}
                  onChange={(e) => setHomeroomClassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Kelas Rombel --</option>
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
