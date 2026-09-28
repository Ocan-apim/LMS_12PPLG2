"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  FileText,
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Loaders";

export interface KurikulumUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  nip: string | null;
  phone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function KurikulumProfile() {
  const [profile, setProfile] = useState<KurikulumUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/kurikulum/profile");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat profil pengguna kurikulum");
      }

      setProfile(json.data.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat profil";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Profil Pengguna Kurikulum
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Informasi identitas akun dan hak akses monitoring akademik pada sistem Learnix LMS.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchProfile}
          disabled={loading}
          aria-label="Segarkan profil"
          className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* 2. Error State */}
      {error && !loading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">Profil tidak dapat dimuat</h2>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchProfile}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Main Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <Skeleton className="size-20 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-8">
            {/* Top Identity Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-5">
                <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600 font-extrabold text-2xl border border-orange-200 shadow-2xs">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "K"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {profile.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Aktif
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {profile.nip ? `NIP. ${profile.nip}` : "Pengelola Akademik"}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100/80 px-2.5 py-1 text-xs font-bold text-orange-800">
                      <ShieldCheck className="size-3.5" />
                      Kurikulum
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Read-Only Evaluator
                    </span>
                  </div>
                </div>
              </div>

              {/* Informational Read-Only Badge */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:max-w-xs text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="size-4 shrink-0 text-slate-400 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Akun Kurikulum memiliki wewenang pemantauan dan evaluasi akademik secara menyeluruh tanpa kontrol mutasi data.
                </p>
              </div>
            </div>

            {/* Information Grid */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Informasi Akun
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Mail className="size-3.5 text-blue-600" />
                    <span>Email Resmi</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                    {profile.email}
                  </p>
                </div>

                {/* NIP */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Award className="size-3.5 text-amber-600" />
                    <span>Nomor Induk Pegawai (NIP)</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                    {profile.nip || "-"}
                  </p>
                </div>

                {/* Telepon */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Phone className="size-3.5 text-emerald-600" />
                    <span>Nomor Telepon</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {profile.phone || "Belum ditambahkan"}
                  </p>
                </div>

                {/* Tanggal Terdaftar */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Calendar className="size-3.5 text-purple-600" />
                    <span>Terdaftar Sejak</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatDateIndo(profile.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Scope of Authority Section */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Cakupan Kewenangan Kurikulum
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-1">
                  <div className="flex items-center gap-2 text-blue-600">
                    <BookOpen className="size-4" />
                    <span className="text-xs font-bold text-slate-900">Monitoring Nilai</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Akses pemantauan capaian nilai per kelas dan komparasi mata pelajaran.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-1">
                  <div className="flex items-center gap-2 text-purple-600">
                    <FileText className="size-4" />
                    <span className="text-xs font-bold text-slate-900">Pelaporan Resmi</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Penerbitan rekap nilai resmi, ekspor format Excel, dan pratinjau cetak.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <User className="size-4" />
                    <span className="text-xs font-bold text-slate-900">Data Beban Guru</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Evaluasi pembagian rombel kelas dan distribusi jam mengajar pengampu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
