import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Learnix - E-Learning SMK Terpadu",
    template: "%s | Learnix",
  },
  description:
    "Platform E-Learning SMK Terpadu untuk Admin, Guru, Siswa, Kurikulum, dan Kepala Sekolah.",
};

// Minimal inline script to prevent flash of un-themed content (FOUC), while keeping "/" strictly in light mode
const themeInitScript = `
(function() {
  try {
    var isLanding = window.location.pathname === "/";
    var saved = localStorage.getItem("learnix-theme");
    var theme = (!isLanding && saved === "dark") ? "dark" : "light";
    var root = document.documentElement;
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      if (meta) meta.setAttribute("content", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      if (meta) meta.setAttribute("content", "light");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
