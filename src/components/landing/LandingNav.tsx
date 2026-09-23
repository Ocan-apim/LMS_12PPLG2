"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionUser } from "@/types";
import { ROLE_DASHBOARD } from "@/lib/roles";

const navItems = [
  { label: "Beranda", href: "#beranda", id: "beranda" },
  { label: "Fitur", href: "#fitur", id: "fitur" },
  { label: "Testimonial", href: "#testimonial", id: "testimonial" },
  { label: "Bantuan", href: "#bantuan", id: "bantuan" },
];

export function LandingNav({ session }: { session?: SessionUser | null }) {
  const [activeSection, setActiveSection] = useState<string>("beranda");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // If scrolled to bottom, highlight footer/bantuan
      if (window.scrollY + windowHeight >= documentHeight - 50) {
        setActiveSection("bantuan");
        return;
      }

      // Check sections in reverse order
      for (let i = navItems.length - 1; i >= 0; i--) {
        const item = navItems[i];
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(item.id);
            return;
          }
        }
      }

      setActiveSection("beranda");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveSection(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--primary)]"
        >
          Learnix LMS
        </Link>

        {/* Center Navlinks with interactive active indicator */}
        <div className="hidden items-center gap-8 text-xs md:flex">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`transition-all duration-200 inline-block py-1 ${
                  isActive
                    ? "-translate-y-0.5 text-[#f9a825] font-bold border-b-2 border-[#f9a825]"
                    : "text-[var(--muted)] font-medium hover:text-[var(--primary)] border-b-2 border-transparent hover:-translate-y-0.5"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Auth / Dashboard CTA */}
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
          <Link
            href="/login"
            className="text-xs font-bold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
          >
            Masuk
          </Link>
        )}
      </div>
    </nav>
  );
}
