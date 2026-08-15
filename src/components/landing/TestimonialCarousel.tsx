"use client";

import { useRef, useState } from "react";

const testimonials = [
  {
    name: "Bp. Ahmad",
    role: "Kepala Sekolah, SMK Citra Negara",
    quote:
      "Learnix sangat membantu kami dalam mengelola kurikulum yang kompleks. Fitur generate nilai otomatis sangat menghemat waktu guru-guru kami.",
  },
  {
    name: "Siska Maharani",
    role: "Mahasiswa Tingkat Akhir",
    quote:
      "Tampilan antarmukanya sangat bersih dan mudah dipahami. Materi jadi lebih gampang diakses di mana saja.",
  },
  {
    name: "Ibu Refita",
    role: "Guru Matematika",
    quote:
      "Saya bisa melihat progress tugas siswa lebih cepat. Kelas terasa lebih terstruktur dan rapi.",
  },
  {
    name: "Dika Pratama",
    role: "Siswa PPLG",
    quote:
      "Pengingat tugas dan file kelas membantu saya tidak ketinggalan materi atau deadline penting.",
  },
  {
    name: "Pak Daniel",
    role: "Guru Produktif",
    quote:
      "Upload materi, kuis, dan penilaian terasa lebih sederhana. Semua aktivitas kelas terkumpul di satu tempat.",
  },
];

const doubled = [...testimonials, ...testimonials];

export function TestimonialCarousel() {
  const [paused, setPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);

  function startDrag(clientX: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setPaused(true);
    dragStart.current = { x: clientX, scrollLeft: scroller.scrollLeft };
  }

  function drag(clientX: number) {
    const scroller = scrollerRef.current;
    if (!scroller || !dragStart.current) return;
    scroller.scrollLeft = dragStart.current.scrollLeft - (clientX - dragStart.current.x);
  }

  function endDrag() {
    dragStart.current = null;
    window.setTimeout(() => setPaused(false), 1200);
  }

  return (
    <div
      ref={scrollerRef}
      className="testimonial-mask overflow-hidden"
      onClick={() => setPaused((value) => !value)}
      onMouseDown={(event) => startDrag(event.clientX)}
      onMouseMove={(event) => drag(event.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={(event) => startDrag(event.touches[0].clientX)}
      onTouchMove={(event) => drag(event.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      <div
        className={`flex w-max gap-8 ${paused ? "[animation-play-state:paused]" : ""} animate-testimonial-marquee cursor-grab active:cursor-grabbing`}
      >
        {doubled.map((item, index) => (
          <article
            key={`${item.name}-${index}`}
            className="w-[340px] shrink-0 rounded-xl border border-[var(--border)] bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]"
          >
            <p className="text-[#f9a825]">*****</p>
            <p className="mt-5 text-sm italic leading-6">&quot;{item.quote}&quot;</p>
            <div className="mt-7 flex items-center gap-4">
              <span className="size-12 rounded-full bg-slate-300" />
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-xs text-[var(--muted)]">{item.role}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
