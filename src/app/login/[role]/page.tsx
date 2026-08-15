import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { isRole } from "@/lib/roles";

type PageProps = {
  params: Promise<{ role: string }>;
};

function AuthFooter() {
  return (
    <footer className="mt-auto w-full px-8 py-6 text-[11px] text-[var(--muted)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2024 Learnix LMS. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="#" className="hover:text-[var(--primary)]">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-[var(--primary)]">
            Terms of Service
          </Link>
          <Link href="#" className="hover:text-[var(--primary)]">
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default async function RoleLoginPage({ params }: PageProps) {
  const { role: roleParam } = await params;

  if (!isRole(roleParam) || roleParam === "admin") {
    notFound();
  }

  const role = roleParam;

  return (
    <main className="flex min-h-screen flex-col">
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[430px] rounded-lg border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-strong)]">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-16 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-[0_14px_30px_rgba(8,104,207,0.24)]">
              <GraduationCap className="size-8" />
            </div>
            <h1 className="mt-7 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
              Selamat Datang Kembali
            </h1>
            <p className="mt-2 max-w-[290px] text-sm leading-5 text-[var(--muted)]">
              Akses portal Learnix Academy untuk memulai sesi pembelajaran Anda hari ini.
            </p>
          </div>

          <div className="mt-8">
            <Suspense fallback={<p className="text-sm text-[var(--muted)]">Memuat form...</p>}>
              <LoginForm role={role} />
            </Suspense>
          </div>
        </div>

        <Link
          href={role === "kurikulum" || role === "kepsek" ? "/login/admin" : "/login"}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </section>

      <AuthFooter />
    </main>
  );
}
