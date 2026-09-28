"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ArrowLeft,
  UserCheck,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type AccountType = "siswa" | "staff";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("siswa");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genericSuccess, setGenericSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Silakan masukkan identitas akun Anda.");
      return;
    }

    setLoading(true);
    setError(null);
    setGenericSuccess(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          identifier: identifier.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Terjadi kesalahan saat memproses permintaan.");
        return;
      }

      if (data.data?.ticketToken) {
        // Legitimate user: redirect to secure ticket conversation
        router.push(`/forgot-password/ticket/${data.data.ticketToken}`);
      } else {
        // Generic protection response
        setGenericSuccess(
          data.message ||
            "Jika akun ditemukan, permintaan bantuan akan dibuat dan dapat ditindaklanjuti oleh Admin."
        );
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[480px]">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_12px_24px_rgba(8,104,207,0.22)]">
              <GraduationCap className="size-7" />
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Lupa Password?
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Masukkan identitas akun Anda untuk menghubungi Admin.
            </p>
          </div>

          {/* Card */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {genericSuccess ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Permintaan Dikirim
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {genericSuccess}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500 text-left">
                  <p className="font-medium text-slate-700">Catatan:</p>
                  <p className="mt-1">
                    Jika Anda tidak dapat mengakses akun atau identitas yang dimasukkan salah,
                    silakan hubungi Administrator sekolah atau bagian Tata Usaha secara langsung.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] transition"
                  >
                    <ArrowLeft className="size-4" />
                    Kembali ke Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Account Type Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Saya adalah:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType("siswa");
                        setIdentifier("");
                        setError(null);
                      }}
                      className={`flex items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition ${
                        accountType === "siswa"
                          ? "border-[var(--primary)] bg-blue-50/50 text-[var(--primary)] font-semibold shadow-xs ring-1 ring-[var(--primary)]"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <UserCheck className="size-4 shrink-0" />
                      <div>
                        <div className="font-medium">Siswa</div>
                        <div className="text-[11px] text-slate-500">Nomor Induk Siswa</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountType("staff");
                        setIdentifier("");
                        setError(null);
                      }}
                      className={`flex items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition ${
                        accountType === "staff"
                          ? "border-[var(--primary)] bg-blue-50/50 text-[var(--primary)] font-semibold shadow-xs ring-1 ring-[var(--primary)]"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <Briefcase className="size-4 shrink-0" />
                      <div>
                        <div className="font-medium">Pekerja</div>
                        <div className="text-[11px] text-slate-500">Guru / Kurikulum / Kepsek</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Identifier Input */}
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
                  >
                    {accountType === "siswa" ? "Nomor Induk Siswa (NIS)" : "NIP atau Email Resmi"}
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      accountType === "siswa"
                        ? "Masukkan NIS"
                        : "Masukkan NIP atau email"
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] transition"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    {accountType === "siswa"
                      ? "Gunakan NIS resmi yang terdaftar pada sistem Learnix."
                      : "Gunakan NIP atau alamat email yang terdaftar sebagai staf pengajar/manajemen."}
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle className="size-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="w-full justify-center py-3 text-sm font-semibold"
                  rightIcon={!loading ? <Send className="size-4" /> : undefined}
                >
                  Hubungi Admin
                </Button>
              </form>
            )}
          </div>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[var(--primary)] transition"
            >
              <ArrowLeft className="size-3.5" />
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
