"use client";

import { useState } from "react";
import { Settings, User, Bell, Shield, Save, Check } from "lucide-react";
import { Button } from "@/components/ui";

export default function GuruSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifySubmissions, setNotifySubmissions] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Akun Guru</h1>
        <p className="text-xs text-slate-500">
          Kelola preferensi akun, notifikasi pengumpulan tugas, dan pengaturan kelas Learnix Anda.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          <Check className="size-4 text-emerald-600" />
          Pengaturan berhasil disimpan!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Notifikasi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Bell className="size-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notifikasi Pembelajaran</h2>
              <p className="text-xs text-slate-400">Atur pemberitahuan untuk aktivitas di kelas Anda</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between cursor-pointer rounded-xl p-2 hover:bg-slate-50 transition">
              <div>
                <p className="text-xs font-semibold text-slate-800">Notifikasi Pengumpulan Tugas Siswa</p>
                <p className="text-[11px] text-slate-400">Terima pemberitahuan ketika siswa mengirimkan tugas baru</p>
              </div>
              <input
                type="checkbox"
                checked={notifySubmissions}
                onChange={(e) => setNotifySubmissions(e.target.checked)}
                className="size-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer rounded-xl p-2 hover:bg-slate-50 transition">
              <div>
                <p className="text-xs font-semibold text-slate-800">Notifikasi Komentar Kelas</p>
                <p className="text-[11px] text-slate-400">Terima pemberitahuan ketika siswa bertanya atau berkomentar di forum kelas</p>
              </div>
              <input
                type="checkbox"
                checked={notifyComments}
                onChange={(e) => setNotifyComments(e.target.checked)}
                className="size-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Keamanan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Shield className="size-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Keamanan & Sesi</h2>
              <p className="text-xs text-slate-400">Informasi keamanan akun guru Anda</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Akun Guru Anda terhubung dengan Portal Akademik Learnix. Untuk perubahan password atau reset kredensial NIP, silakan hubungi Administrator Sekolah.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            leftIcon={<Save className="size-4" />}
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
