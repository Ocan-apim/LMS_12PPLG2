"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/types";
import { ROLE_LABELS } from "@/lib/roles";

type LoginFormProps = {
  role?: Role;
};

export function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message ?? "Login gagal");
        return;
      }

      const next = searchParams.get("next");
      router.push(next || result.data.redirectTo);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = role ? ROLE_LABELS[role] : "Pengguna";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="relative block">
        <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Username atau Email"
          className="h-14 w-full rounded-[5px] border border-[var(--border)] bg-[#f4f6ff] pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
        />
      </label>

      <label className="relative block">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-14 w-full rounded-[5px] border border-[var(--border)] bg-[#f4f6ff] pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
        />
        <button
          type="button"
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          onClick={() => setShowPassword((value) => !value)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-[var(--primary)]"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </label>

      <div className="flex items-center justify-between">
        <LinkLike />
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        rightIcon={<LogIn className="size-4" />}
        className="h-14 w-full text-base"
      >
        Login
      </Button>

      <div className="border-t border-[var(--border)] pt-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        Masuk Sebagai: {roleLabel}
      </div>
    </form>
  );
}

function LinkLike() {
  return (
    <button
      type="button"
      className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)]"
    >
      Lupa Password?
    </button>
  );
}
