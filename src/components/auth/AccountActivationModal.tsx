"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  UserCheck,
  UserRound,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import type { SessionUser } from "@/types";

type AccountActivationModalProps = {
  user: SessionUser;
  onActivated: (updatedUser: SessionUser) => void;
};

export function AccountActivationModal({
  user,
  onActivated,
}: AccountActivationModalProps) {
  const router = useRouter();
  const initialUsername = user.loginUsername || "";

  const [username, setUsername] = useState(initialUsername);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [remoteUsernameStatus, setRemoteUsernameStatus] = useState<{
    checkedUsername: string;
    available: boolean | null;
    message: string;
  }>({ checkedUsername: "", available: null, message: "" });

  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  // Prevent Escape key from closing or interacting outside the mandatory modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const trimmedUsernameInput = username.trim();
  const isUnchangedInitial =
    Boolean(initialUsername) &&
    trimmedUsernameInput.toLowerCase() === initialUsername.toLowerCase();

  // Debounced username availability check for customized usernames
  useEffect(() => {
    if (!trimmedUsernameInput || isUnchangedInitial) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setCheckingUsername(true);
        const res = await fetch(
          `/api/auth/activate?username=${encodeURIComponent(trimmedUsernameInput)}`
        );
        if (cancelled) return;
        if (res.status === 401) {
          setError("Sesi Anda telah berakhir. Silakan login kembali.");
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setRemoteUsernameStatus({
          checkedUsername: trimmedUsernameInput,
          available: Boolean(json.available),
          message: json.message || "",
        });
      } catch {
        if (!cancelled) {
          setRemoteUsernameStatus({
            checkedUsername: trimmedUsernameInput,
            available: null,
            message: "",
          });
        }
      } finally {
        if (!cancelled) {
          setCheckingUsername(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedUsernameInput, isUnchangedInitial, router]);

  const usernameStatus = !trimmedUsernameInput
    ? { available: false, message: "Username tidak boleh kosong" }
    : isUnchangedInitial
      ? {
          available: true,
          message: "Menggunakan username awal yang ditetapkan Admin",
        }
      : remoteUsernameStatus.checkedUsername === trimmedUsernameInput
        ? {
            available: remoteUsernameStatus.available,
            message: remoteUsernameStatus.message,
          }
        : { available: null, message: "" };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Username wajib diisi");
      return;
    }

    if (!newPassword) {
      setError("Password baru wajib diisi");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password baru minimal harus 6 karakter");
      return;
    }

    if (!confirmPassword) {
      setError("Konfirmasi password baru wajib diisi");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();

      if (res.status === 401) {
        setError(
          json.message || "Sesi Anda telah berakhir. Silakan login kembali."
        );
        setTimeout(() => {
          router.push("/login");
          router.refresh();
        }, 800);
        return;
      }

      if (!res.ok || !json.success) {
        setError(json.message || "Gagal mengaktivasi akun");
        return;
      }

      // Only close popup after backend confirms activation succeeded
      onActivated(json.data.user);
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-modal-title"
      aria-describedby="activation-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <ShieldCheck className="size-7" />
          </div>
          <h2
            id="activation-modal-title"
            className="mt-4 text-xl sm:text-2xl font-extrabold text-slate-900"
          >
            Aktivasi Akun Learnix
          </h2>
          <p
            id="activation-modal-description"
            className="mt-1.5 text-xs sm:text-sm text-slate-600"
          >
            Lengkapi pengaturan akun Anda sebelum melanjutkan ke Learnix.
          </p>
        </div>

        {/* Read-only Official Biodata Summary */}
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <UserCheck className="size-4 text-blue-600 shrink-0" />
              <span>{user.name}</span>
            </div>
            <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {roleLabel}
            </span>
          </div>
          {user.nip && (
            <p className="mt-1 text-[11px] font-mono text-slate-600">
              NIP: {user.nip}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            Nama resmi dan biodata kepegawaian Anda tetap terjaga dan tidak akan
            diubah oleh pengaturan username login di bawah ini.
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* A. Username */}
          <div>
            <label
              htmlFor="activation-username"
              className="mb-1.5 block text-xs font-bold text-slate-800"
            >
              Username Login <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="activation-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: ahmad.fauzan"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Username ini akan digunakan untuk login ke Learnix selanjutnya
              (menggantikan NIP/Email). Anda dapat tetap menggunakan username
              saat ini atau mengubahnya.
            </p>
            {usernameStatus.message && (
              <p
                className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
                  usernameStatus.available
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {usernameStatus.available ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0" />
                )}
                <span>{usernameStatus.message}</span>
              </p>
            )}
          </div>

          {/* B. New Password */}
          <div>
            <label
              htmlFor="activation-new-password"
              className="mb-1.5 block text-xs font-bold text-slate-800"
            >
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="activation-new-password"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                aria-label={
                  showNewPassword
                    ? "Sembunyikan password baru"
                    : "Tampilkan password baru"
                }
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* C. Confirm New Password */}
          <div>
            <label
              htmlFor="activation-confirm-password"
              className="mb-1.5 block text-xs font-bold text-slate-800"
            >
              Konfirmasi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="activation-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? "Sembunyikan konfirmasi password"
                    : "Tampilkan konfirmasi password"
                }
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* D. Activation Button & Logout Action */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={submitting || loggingOut}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Mengaktifkan Akun...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Aktifkan Akun</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={submitting || loggingOut}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>
                {loggingOut ? "Keluar..." : "Keluar (Logout Sementara)"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
