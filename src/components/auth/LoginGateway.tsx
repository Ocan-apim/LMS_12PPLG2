import Link from "next/link";
import { ArrowLeft, GraduationCap, ShieldCheck, UserRound } from "lucide-react";

const roles = [
  {
    title: "Siswa",
    href: "/login/siswa",
    description: "Akses materi, tugas, dan nilai akademik Anda.",
    icon: UserRound,
    tone: "bg-[#cff9ef] text-[#00796f]",
  },
  {
    title: "Guru",
    href: "/login/guru",
    description: "Kelola tugas siswa, berikan nilai, dan buat kuis atau ujian.",
    icon: UserRound,
    tone: "bg-[#cff9ef] text-[#00796f]",
  },
  {
    title: "Admin",
    href: "/login/admin",
    description: "Kelola kurikulum, guru, dan administrasi sistem.",
    icon: ShieldCheck,
    tone: "bg-[#e6ddff] text-[#6f56dc]",
  },
];

function AuthFooter() {
  return (
    <footer className="mt-auto w-full border-t border-[var(--border)] bg-white/35 px-6 py-6 text-[11px] text-[var(--muted)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Learnix LMS. All rights reserved.</p>
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

export function LoginGateway() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="grid size-11 place-items-center rounded-lg bg-[var(--primary)] text-white shadow-[0_14px_30px_rgba(8,104,207,0.26)]">
            <GraduationCap className="size-5" />
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
            Learnix LMS
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pusat Pembelajaran Digital Terintegrasi
          </p>
        </div>

        <div className="mt-12 w-full rounded-lg border border-[var(--border)] bg-white/72 px-8 py-10 shadow-[var(--shadow)] backdrop-blur sm:px-12">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              Masuk sebagai?
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Pilih peran Anda untuk melanjutkan ke dashboard
            </p>
          </div>

          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {roles.map((role) => {
              const Icon = role.icon;

              return (
                <Link
                  key={role.title}
                  href={role.href}
                  className="group flex min-h-[184px] flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-white px-6 py-7 text-center shadow-sm transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
                >
                  <span
                    className={`grid size-16 place-items-center rounded-full ${role.tone}`}
                  >
                    <Icon className="size-7" />
                  </span>
                  <span className="mt-6 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                    {role.title}
                  </span>
                  <span className="mt-3 max-w-[190px] text-xs leading-5 text-[var(--muted)]">
                    {role.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-8 text-xs text-[var(--muted)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
          >
            <ArrowLeft className="size-3.5" />
            Kembali ke Beranda
          </Link>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-[var(--primary)]">
              Syarat & Ketentuan
            </Link>
            <span>•</span>
            <Link href="#" className="hover:text-[var(--primary)]">
              Pusat Bantuan
            </Link>
          </div>
        </div>
      </section>

      <AuthFooter />
    </main>
  );
}
