"use client";

import { useEffect, useState } from "react";
import { Building, Save, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface SettingsData {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  headmasterName: string;
  currentAcademicYear: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    schoolName: "",
    npsn: "",
    address: "",
    phone: "",
    email: "",
    headmasterName: "",
    currentAcademicYear: "2024/2025 - Genap",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.success && json.data) {
          setSettings(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal menyimpan pengaturan");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Terjadi kesalahan sistem saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Sistem & Profil Sekolah</h1>
          <p className="text-sm text-slate-500">
            Konfigurasi data identitas SMK, kepala sekolah, dan preferensi aplikasi Learnix.
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>Pengaturan profil sekolah berhasil disimpan!</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Identitas Sekolah */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 pb-3 border-b border-slate-100">
            <Building className="size-4 text-blue-600" />
            <span>Identitas Satuan Pendidikan (SMK)</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sekolah Resmi
              </label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Pokok Sekolah Nasional (NPSN)
              </label>
              <input
                type="text"
                value={settings.npsn}
                onChange={(e) => setSettings({ ...settings, npsn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.headmasterName}
                onChange={(e) => setSettings({ ...settings, headmasterName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Ajaran Berjalan
              </label>
              <input
                type="text"
                value={settings.currentAcademicYear}
                onChange={(e) => setSettings({ ...settings, currentAcademicYear: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon Sekolah
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Sekolah
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap Sekolah
            </label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Card 2: Batasan & Hak Akses Kebijakan Sistem */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 pb-3 border-b border-slate-100">
            <Shield className="size-4 text-emerald-600" />
            <span>Kebijakan Hak Akses Pembelajaran (Admin Guardrails)</span>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed bg-slate-50 p-4 rounded-lg">
            <div className="font-semibold text-slate-800 mb-1">Kebijakan LMS Sekolah Vokasi:</div>
            <p>• Admin mengelola data master pengguna, jurusan, kelas rombel, mapel, dan tahun ajaran.</p>
            <p className="text-slate-500">
              • <strong>Tanggung Jawab Guru:</strong> Pembuatan tugas kelas, input dan pengubahan nilai siswa, serta pengelolaan materi pembelajaran dikelola langsung secara mandiri oleh guru mata pelajaran.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 shadow-xs"
            leftIcon={<Save className="size-4" />}
          >
            {saving ? "Menyimpan Pengaturan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
