"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  Info,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface StudentAccountInfo {
  name: string;
  email: string;
  nisn?: string;
  nis?: string;
  grade?: string;
  className?: string;
  role: string;
}

export function StudentSettings() {
  const [account, setAccount] = useState<StudentAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Notification Preferences (persisted in localStorage for client preferences)
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyQuizzes, setNotifyQuizzes] = useState(true);
  const [notifyGrades, setNotifyGrades] = useState(true);
  const [notifyDeadlines, setNotifyDeadlines] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await fetch("/api/siswa/profile");
        const json = await res.json();
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setAccount({
            name: u.name,
            email: u.email,
            nisn: u.nisn,
            nis: u.nis,
            grade: u.grade,
            className: u.classId?.name,
            role: u.role,
          });
        }
      } catch (err) {
        console.error("Gagal memuat info akun:", err);
      } finally {
        setLoading(false);
      }
    }

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

  function handleSave(e: React.FormEvent) {
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
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Pengaturan Akun Siswa
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola preferensi akun, pemberitahuan tugas & kuis, serta tinjau keamanan portal akademik Anda.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
          <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
          <span>Preferensi akun berhasil disimpan!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account Info Section */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <User className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Informasi Kredensial Akun</h2>
              <p className="text-xs text-slate-400">Data akun siswa Anda yang terdaftar pada sistem sekolah</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs">
            <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Siswa</span>
              <p className="font-semibold text-slate-800 mt-0.5">{account?.name || "Siswa"}</p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Akun</span>
              <p className="font-semibold text-slate-800 mt-0.5">{account?.email || "-"}</p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NISN / NIS</span>
              <p className="font-semibold text-slate-800 font-mono mt-0.5">
                {account?.nisn || "-"} / {account?.nis || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas & Tingkat</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {account?.className || "Rombel Siswa"} (Tingkat {account?.grade || "12"})
              </p>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <Bell className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Preferensi Notifikasi Pembelajaran</h2>
              <p className="text-xs text-slate-400">Atur aktivitas mana saja yang akan ditampilkan pada daftar notifikasi</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between cursor-pointer rounded-2xl p-3 hover:bg-slate-50/80 transition border border-transparent hover:border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Tugas Baru Diumumkan</p>
                <p className="text-[11px] text-slate-400">Terima notifikasi ketika guru mempublikasikan tugas baru di kelas</p>
              </div>
              <input
                type="checkbox"
                checked={notifyAssignments}
                onChange={(e) => setNotifyAssignments(e.target.checked)}
                className="size-4.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer rounded-2xl p-3 hover:bg-slate-50/80 transition border border-transparent hover:border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Kuis Baru Tersedia</p>
                <p className="text-[11px] text-slate-400">Terima notifikasi saat guru membuka kuis online untuk dikerjakan</p>
              </div>
              <input
                type="checkbox"
                checked={notifyQuizzes}
                onChange={(e) => setNotifyQuizzes(e.target.checked)}
                className="size-4.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer rounded-2xl p-3 hover:bg-slate-50/80 transition border border-transparent hover:border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Nilai & Masukan Diberikan</p>
                <p className="text-[11px] text-slate-400">Terima notifikasi ketika tugas atau kuis Anda telah diperiksa dan dinilai guru</p>
              </div>
              <input
                type="checkbox"
                checked={notifyGrades}
                onChange={(e) => setNotifyGrades(e.target.checked)}
                className="size-4.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer rounded-2xl p-3 hover:bg-slate-50/80 transition border border-transparent hover:border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Pengingat Batas Waktu (Deadline)</p>
                <p className="text-[11px] text-slate-400">Peringatan untuk tugas yang mendekati batas waktu pengumpulan</p>
              </div>
              <input
                type="checkbox"
                checked={notifyDeadlines}
                onChange={(e) => setNotifyDeadlines(e.target.checked)}
                className="size-4.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Security & Access Section */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Shield className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Keamanan Akun & Kredensial</h2>
              <p className="text-xs text-slate-400">Kebijakan kredensial dan sesi portal siswa</p>
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 flex gap-3 text-xs text-amber-900">
            <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Pengelolaan Kredensial Terpusat</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Akun Siswa Anda terhubung langsung dengan Database Akademik Sekolah.
                Untuk menjaga integritas data penilaian dan kelas, perubahan password, NISN, atau pemindahan rombel dilakukan secara terpusat melalui Administrator Sekolah atau Wali Kelas Anda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs px-5 py-2.5"
            leftIcon={<Save className="size-4" />}
          >
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  );
}
