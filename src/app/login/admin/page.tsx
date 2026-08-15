import Link from "next/link";
import { ArrowLeft, ClipboardList, CircleHelp, GraduationCap, ShieldCheck } from "lucide-react";

const adminRoles = [
  {
    title: "Admin",
    href: "/login/admin/system",
    description:
      "Akses modul pengajaran, manajemen kelas dan guru, serta register akun baru.",
    icon: GraduationCap,
    tone: "bg-[#e5f1ff] text-[var(--primary)]",
  },
  {
    title: "Kurikulum",
    href: "/login/admin/kurikulum",
    description:
      "Pantau performa guru, kelola data kelas, serta download laporan nilai per mata pelajaran atau jurusan.",
    icon: ClipboardList,
    tone: "bg-[#e3f6f2] text-[#00796f]",
  },
  {
    title: "Kepsek",
    href: "/login/admin/kepsek",
    description:
      "Akses pengawasan penuh tingkat institusi, tinjau tabel data guru, dan monitoring aktivitas akademik secara menyeluruh.",
    icon: ShieldCheck,
    tone: "bg-[#eee9ff] text-[#6f56dc]",
  },
];

export default function AdminRolePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/65 px-7">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--primary)]">
          Learnix LMS
        </Link>
        <Link href="#" aria-label="Pusat bantuan" className="text-[var(--muted)] hover:text-[var(--primary)]">
          <CircleHelp className="size-5" />
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.03em]">
            Masuk sebagai Admin
          </h1>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Pilih hak akses administratif Anda untuk melanjutkan ke dashboard pengelolaan.
          </p>
        </div>

        <div className="mt-8 grid w-full gap-6 md:grid-cols-3">
          {adminRoles.map((role) => {
            const Icon = role.icon;

            return (
              <Link
                key={role.title}
                href={role.href}
                className="group flex min-h-[340px] flex-col items-center rounded-lg border border-[var(--border)] bg-white px-10 py-10 text-center shadow-sm transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
              >
                <span className={`grid size-16 place-items-center rounded-full ${role.tone}`}>
                  <Icon className="size-8" />
                </span>
                <span className="mt-9 font-[family-name:var(--font-display)] text-xl font-bold group-hover:text-[var(--primary)]">
                  {role.title}
                </span>
                <span className="mt-5 text-sm leading-6 text-[var(--muted)]">
                  {role.description}
                </span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/login"
          className="mt-16 inline-flex items-center gap-2 text-base font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
        >
          <ArrowLeft className="size-5" />
          Kembali
        </Link>
      </section>
    </main>
  );
}
