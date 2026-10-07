"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Check, Copy, ChevronRight } from "lucide-react";

interface RombelOption {
  _id: string;
  name: string;
  grade: string;
}

export default function BuatKelasMapelPage() {
  const router = useRouter();

  const [rombels, setRombels] = useState<RombelOption[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRombelIds, setSelectedRombelIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [createdClass, setCreatedClass] = useState<{
    _id: string;
    name: string;
    code: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadRombels() {
      try {
        const res = await fetch("/api/admin/classes");
        const json = await res.json();
        if (json.success) {
          setRombels(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat rombel:", err);
      }
    }
    loadRombels();
  }, []);

  function toggleRombel(id: string) {
    setSelectedRombelIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama kelas / mapel wajib diisi");
      return;
    }
    if (!password.trim()) {
      setError("Password kelas wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/guru/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          password: password.trim(),
          classRombelId: selectedRombelIds[0] || undefined,
          assignedRombelIds: selectedRombelIds,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal membuat kelas");
      } else {
        setCreatedClass({
          _id: json.data._id,
          name: json.data.name,
          code: json.data.code,
          password: json.data.password,
        });
      }
    } catch {
      setError("Terjadi kesalahan sistem saat membuat kelas");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!createdClass) return;
    const text = `Kelas: ${createdClass.name}\nKode Kelas: ${createdClass.code}\nPassword: ${createdClass.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Breadcrumb matching Screenshot 2 Right */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link href="/guru" className="hover:text-blue-600 transition">
          Dashboard
        </Link>
        <ChevronRight className="size-3 text-slate-300" />
        <span className="text-blue-600 font-semibold">Tambah Kelas Baru</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {!createdClass ? (
        /* Giant Blue Gradient Card matching Screenshot 2 Right */
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-blue-600 to-indigo-700 p-8 sm:p-14 text-white shadow-xl">
          <div className="mx-auto max-w-lg text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Buat Kelas Mapel
            </h1>
            <p className="text-sm text-blue-100/90 font-medium">
              Kode Kelas akan digenerate oleh sistem
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-md space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-2 text-center">
                Nama Kelas / Mapel
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

            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1.5 text-center">
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

            <div>
              <label className="block text-sm font-semibold text-white mb-2 text-center">
                Password Kelas
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Buatlah password kelas"
                required
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Assign ke Kelas / Rombel selector */}
            {rombels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white uppercase tracking-wider">
                    Assign ke Kelas / Rombel
                  </label>
                  <span className="text-[11px] text-blue-200">
                    {selectedRombelIds.length} dipilih
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80">
                  Siswa di rombel yang dipilih akan otomatis terdaftar dan menerima notifikasi kelas baru tanpa perlu memasukkan kode manual.
                </p>

                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl bg-white/10 p-3 border border-white/20">
                  {rombels.map((r) => {
                    const isChecked = selectedRombelIds.includes(r._id);
                    return (
                      <label
                        key={r._id}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer text-xs transition ${
                          isChecked ? "bg-white/20 font-bold text-white" : "text-blue-100 hover:bg-white/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRombel(r._id)}
                          className="size-4 rounded text-blue-600 focus:ring-blue-500 bg-white"
                        />
                        <span className="flex-1">{r.name}</span>
                        <span className="text-[10px] text-blue-200 font-normal">
                          Tingkat {r.grade}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-bold text-blue-600 shadow-md hover:bg-blue-50 transition disabled:opacity-50"
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
          <h2 className="text-xl font-bold text-slate-900">Kelas Berhasil Dibuat!</h2>
          <p className="text-xs text-slate-500">
            Bagikan kode kelas dan password berikut kepada siswa Anda.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-left text-xs">
            <p>
              <span className="text-slate-500">Nama Kelas:</span>{" "}
              <strong className="text-slate-900">{createdClass.name}</strong>
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Tersalin!" : "Salin Kode"}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/guru/classes/${createdClass._id}`)}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Buka Kelas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
