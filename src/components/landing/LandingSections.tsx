import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Rocket,
  Rss,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/types";
import { ROLE_DASHBOARD } from "@/lib/roles";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { RainbowSweepText } from "@/components/landing/RainbowSweepText";
import { WaveFlipText } from "@/components/landing/WaveFlipText";

const featureCards = [
  {
    title: "Materi Pembelajaran Interaktif",
    description:
      "Upload materi dalam berbagai format (PDF, Word, Excel, PNG) Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    icon: BookOpen,
    tone: "bg-[#e5f1ff] text-[var(--primary)]",
    wide: true,
  },
  {
    title: "Penilaian Otomatis",
    description:
      "Buat kuis dan ujian dengan beragam tipe soal. Hasil akan langsung keluar dan terintegrasi dengan rapor siswa secara otomatis.",
    icon: Database,
    tone: "bg-[#eee9ff] text-[#6f56dc]",
  },
  {
    title: "Analitik Komprehensif",
    description:
      "Pantau performa per kelas, per mata pelajaran, hingga per siswa dengan visualisasi data yang user-friendly.",
    icon: BarChart3,
    tone: "bg-[#e3f6f2] text-[#00796f]",
  },
  {
    title: "Coba Demo Kuis Interaktif",
    description:
      "Rasakan pengalaman belajar yang menyenangkan dengan kuis interaktif yang penuh warna dan kompetitif.",
    icon: Rocket,
    tone: "bg-[#f6edff] text-[#f9a825]",
    quiz: true,
  },
];

const roles = [
  {
    title: "Manajemen Kelas",
    text: "Guru dapat membuat kelas, mengunggah materi, dan memberikan tugas dengan sangat mudah.",
    icon: Users,
  },
  {
    title: "Generate Nilai Otomatis",
    text: "Sistem secara otomatis mengolah nilai per mata pelajaran, per kelas, hingga per jurusan.",
    icon: Database,
  },
  {
    title: "Monitoring Institusi",
    text: "Kepala sekolah dan Kurikulum dapat memantau data guru serta mendownload laporan performa dengan satu klik.",
    icon: ShieldCheck,
  },
];

function SectionTitle() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
        <RainbowSweepText text="Fitur Unggulan Learnix" />
      </h2>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        Semua yang Anda butuhkan untuk mengelola kelas dan memantau perkembangan akademik dalam satu tempat.
      </p>
    </div>
  );
}

function MiniCourseMockup() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-[10px] font-bold">
        <span>Upload Course Materials</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">Multi-format</span>
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-[#f8fbff] p-4 text-center">
        <BookOpen className="mx-auto size-7 text-[var(--primary)]" />
        <p className="mt-2 text-[10px] font-semibold">Drag & drop files here</p>
        <div className="mt-3 flex justify-center gap-2">
          <span className="rounded bg-[var(--primary)] px-3 py-1 text-[9px] text-white">Browse Files</span>
          <span className="rounded bg-slate-100 px-3 py-1 text-[9px] text-slate-600">From Google Drive</span>
        </div>
      </div>
    </div>
  );
}

function QuizMockup() {
  return (
    <div className="w-full rounded-2xl bg-[#f1f3ff] p-4">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-[#d9deeb] bg-slate-950 shadow-sm">
        <video
          className="h-full w-full object-cover"
          controls
          preload="metadata"
          aria-label="Placeholder video demo kuis Learnix"
        />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-white">
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/15 backdrop-blur">
              <Play className="ml-1 size-8 fill-white" />
            </span>
            <p className="mt-4 text-sm font-bold">Video Placeholder</p>
            <p className="mt-1 text-xs text-white/70">
              Ganti dengan video demo kuis interaktif.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingNav({ session }: { session?: SessionUser | null }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--primary)]">
          Learnix LMS
        </Link>
        <div className="hidden items-center gap-9 text-xs font-medium text-[var(--muted)] md:flex">
          <a className="border-b-2 border-[#f9a825] pb-2 text-[#f9a825]" href="#beranda">Beranda</a>
          <a className="transition hover:text-[var(--primary)]" href="#fitur">Fitur</a>
          <a className="transition hover:text-[var(--primary)]" href="#testimonial">Testimonial</a>
          <a className="transition hover:text-[var(--primary)]" href="#bantuan">Bantuan</a>
        </div>
        {session ? (
          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
              Halo, {session.name}
            </span>
            <Link
              href={ROLE_DASHBOARD[session.role]}
              className="text-xs font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <Link href="/login" className="text-xs font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
            Masuk
          </Link>
        )}
      </div>
    </nav>
  );
}

export function LandingHero() {
  return (
    <section id="beranda" className="bg-white">
      <div className="mx-auto grid min-h-[610px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.9fr]">
        <ScrollReveal>
          <h1 className="max-w-xl font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.08] tracking-[-0.04em]">
            <WaveFlipText text="Transformasikan Cara" />
            <br />
            <WaveFlipText
              text="Belajar Mengajar"
              className="text-[var(--primary)]"
              delay={0.18}
            />
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-6 text-[var(--muted)]">
            <WaveFlipText
              text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam a tempus nisi, et aliquet enim. Pellentesque gravida elit quis risus varius gravida. Sed ac scelerisque quam. Fusce ac condimentum libero, et sollicitudin turpis."
              duration={0.42}
              stagger={0.008}
              delay={0.52}
            />
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-lg bg-[var(--primary)] px-9 py-4 text-sm font-bold text-white shadow-[0_15px_30px_rgba(8,104,207,0.25)] transition duration-300 hover:-translate-y-1 hover:bg-[var(--primary-hover)]"
          >
            Mulai Sekarang
          </Link>
          <div className="mt-14 flex items-center gap-4 text-xs text-[var(--muted)]">
            <div className="flex -space-x-2">
              {["A", "B", "C"].map((initial) => (
                <span key={initial} className="grid size-8 place-items-center rounded-full border-2 border-white bg-slate-200 font-bold text-slate-600">
                  {initial}
                </span>
              ))}
            </div>
            <span>Dipercaya oleh <strong className="text-[var(--foreground)]">2,000+</strong> Institusi Pendidikan</span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={120} className="rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[0_28px_58px_rgba(15,23,42,0.16)]">
          <Image
            src="/heroLanding.png"
            alt="Ilustrasi siswa dan guru Learnix SMK Citra Negara"
            width={720}
            height={480}
            priority
            className="h-auto w-full rounded-xl"
          />
        </ScrollReveal>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section id="fitur" className="bg-[#f7f7ff] py-24">
      <ScrollReveal className="mx-auto max-w-7xl px-6">
        <SectionTitle />
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`rounded-2xl border border-[var(--border)] bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] ${feature.wide ? "lg:col-span-2" : ""} ${feature.quiz ? "lg:col-span-2" : ""}`}
              >
                <div className={`${feature.quiz || feature.wide ? "grid gap-8 md:grid-cols-2 md:items-center" : ""}`}>
                  <div>
                    <div className={`grid size-12 place-items-center rounded-lg ${feature.tone}`}>
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold">{feature.title}</h3>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
                    {feature.wide ? (
                      <ul className="mt-5 space-y-3 text-sm">
                        {["Multi-format Content Delivery", "Lainnya", "Lorem Ipsum"].map((item) => (
                          <li key={item} className="flex items-center gap-3">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {feature.quiz ? (
                      <button className="mt-6 rounded-md bg-[#f9a825] px-5 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5">
                        Mulai Kuis
                      </button>
                    ) : null}
                  </div>
                  {feature.wide ? <MiniCourseMockup /> : null}
                  {feature.quiz ? <div className="flex justify-center"><QuizMockup /></div> : null}
                </div>
                {feature.title === "Analitik Komprehensif" ? (
                  <div className="mt-7 h-48 rounded-2xl bg-[#dcd6f5]" />
                ) : null}
              </article>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}

export function LandingAbout() {
  return (
    <section id="tentang" className="bg-[#eef1fb] py-24">
      <ScrollReveal className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-[0.9fr_1fr]">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight">
            Satu Platform,<br />Multi-Peran yang Sinergis
          </h2>
          <p className="mt-7 max-w-lg text-sm leading-6 text-[var(--muted)]">
            Berdasarkan kebutuhan riil institusi pendidikan, Learnix dirancang dengan sistem hak akses (Privilege) yang ketat namun fleksibel.
          </p>
          <div className="mt-10 space-y-9">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.title} className="flex gap-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dcecff] text-[var(--primary)]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">{role.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{role.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-[var(--shadow-strong)]">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Tabel Privilege <span className="text-[var(--primary)]">Learnix</span>
          </h3>
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs">
                <th className="py-4">Aksi Utama</th>
                <th>Siswa</th>
                <th>Guru</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody className="text-[var(--muted)]">
              {[
                ["Membaca Materi", true, true, true],
                ["Upload Materi / Tugas", true, true, false],
                ["Generate Nilai Jurusan", false, true, true],
                ["Download Data Guru", false, false, true],
              ].map(([name, siswa, guru, admin], index) => (
                <tr
                  key={String(name)}
                  className="animate-drop-row border-b border-[var(--border)] opacity-0 last:border-0"
                  style={{ animationDelay: `${index * 280}ms` }}
                >
                  <td className="py-4">{name}</td>
                  {[siswa, guru, admin].map((ok, index) => (
                    <td key={index}>{ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </section>
  );
}

export function LandingTestimonials() {
  return (
    <section id="testimonial" className="bg-[#f7f7ff] py-24">
      <ScrollReveal className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.7fr_1.8fr]">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">Apa Kata Mereka?</h2>
          <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam a tempus nisi, et aliquet enim. Pellentesque gravida elit quis risus varius gravida.
          </p>
        </div>
        <TestimonialCarousel />
      </ScrollReveal>
    </section>
  );
}

export function LandingCta() {
  return (
    <section className="bg-[#f7f7ff] px-6 py-20">
      <ScrollReveal className="mx-auto max-w-7xl rounded-3xl bg-[var(--primary)] px-6 py-24 text-center text-white shadow-[0_26px_48px_rgba(15,23,42,0.25)]">
        <h2 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
          <RainbowSweepText text="Siap Memulai Transformasi?" />
        </h2>
        <p className="mt-8 text-sm italic text-white/80">Lorem Ipsum</p>
        <Link href="/login" className="mt-8 inline-flex rounded-lg bg-white px-12 py-4 text-sm font-semibold text-[#f9a825] transition duration-300 hover:-translate-y-1">
          Mulai Belajar
        </Link>
      </ScrollReveal>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer id="bantuan" className="border-t border-[var(--border)] bg-white">
      <ScrollReveal className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-12">
        {/* Col 1: Brand & Desc */}
        <div className="md:col-span-4 lg:col-span-3">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--primary)]">
            Learnix LMS
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-700">
            SMK CITRA NEGARA DEPOK
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Platform manajemen pembelajaran cerdas yang dirancang untuk mendukung kegiatan belajar mengajar siswa dan guru di SMK Citra Negara Depok.
          </p>
          <div className="mt-6 flex gap-2.5">
            {[MessageCircle, Share2, Rss].map((Icon, index) => (
              <span key={index} className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-[var(--primary)] transition">
                <Icon className="size-4" />
              </span>
            ))}
          </div>
        </div>

        {/* Col 2: Navigasi Aplikasi */}
        <div className="md:col-span-4 lg:col-span-2">
          <p className="text-xs font-extrabold tracking-wider text-slate-900">NAVIGASI</p>
          <div className="mt-4 space-y-2.5 text-xs text-[var(--muted)]">
            <p><a href="#beranda" className="hover:text-[var(--primary)] transition">Beranda</a></p>
            <p><a href="#fitur" className="hover:text-[var(--primary)] transition">Fitur Unggulan</a></p>
            <p><a href="#tentang" className="hover:text-[var(--primary)] transition">Hak Akses Peran</a></p>
            <p><a href="#testimonial" className="hover:text-[var(--primary)] transition">Testimonial</a></p>
            <p><Link href="/login" className="hover:text-[var(--primary)] transition font-semibold text-[var(--primary)]">Halaman Masuk</Link></p>
          </div>
        </div>

        {/* Col 3: Portal Login Role */}
        <div className="md:col-span-4 lg:col-span-2">
          <p className="text-xs font-extrabold tracking-wider text-slate-900">PORTAL LOGIN</p>
          <div className="mt-4 space-y-2.5 text-xs text-[var(--muted)]">
            <p><Link href="/login/siswa" className="hover:text-[var(--primary)] transition">Portal Siswa</Link></p>
            <p><Link href="/login/guru" className="hover:text-[var(--primary)] transition">Portal Guru</Link></p>
            <p><Link href="/login/admin/admin" className="hover:text-[var(--primary)] transition">Administrator</Link></p>
            <p><Link href="/login/admin/kurikulum" className="hover:text-[var(--primary)] transition">Kurikulum</Link></p>
            <p><Link href="/login/admin/kepsek" className="hover:text-[var(--primary)] transition">Kepala Sekolah</Link></p>
          </div>
        </div>

        {/* Col 4: Kontak Kami SMK Citra Negara */}
        <div className="md:col-span-6 lg:col-span-3">
          <p className="text-xs font-extrabold tracking-wider text-slate-900">KONTAK KAMI</p>
          <div className="mt-4 space-y-3 text-xs text-[var(--muted)]">
            <div className="flex items-start gap-2.5">
              <MapPin className="size-4 shrink-0 text-[var(--primary)] mt-0.5" />
              <span className="leading-relaxed">
                <strong className="text-slate-800">SMK Citra Negara Depok</strong><br />
                Jl. Tanah Baru No. 128, RT 002/RW 003, Kel. Beji, Kec. Beji, Kota Depok, Jawa Barat 16421
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-[var(--primary)]" />
              <span>(021) 775 8852 / +62 812-8228-4747</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-[var(--primary)]" />
              <span>info@smkcitranegara.sch.id</span>
            </div>
          </div>
        </div>

        {/* Col 5: Square Map Pinpointing SMK Citra Negara */}
        <div className="md:col-span-6 lg:col-span-2 flex flex-col items-start md:items-end">
          <div className="w-full max-w-[210px]">
            <p className="text-xs font-extrabold tracking-wider text-slate-900 mb-3">LOKASI SEKOLAH</p>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs">
              <iframe
                title="Peta Lokasi SMK Citra Negara Depok"
                src="https://maps.google.com/maps?q=SMK+Citra+Negara+Depok,+Jl.+Tanah+Baru+No.128,+Beji,+Kota+Depok&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href="https://maps.google.com/?q=SMK+Citra+Negara+Depok"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
            >
              Buka di Google Maps <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </ScrollReveal>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-[var(--border)] px-6 py-6 text-xs text-[var(--muted)] md:flex-row md:justify-between">
        <p>© 2026 Learnix LMS. All rights reserved.</p>
        <div className="flex gap-8">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
}
