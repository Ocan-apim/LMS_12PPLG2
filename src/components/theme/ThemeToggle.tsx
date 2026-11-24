"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({
  showLabel = false,
  className = "",
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
      title={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] shadow-xs transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] cursor-pointer ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="size-4 text-amber-400 shrink-0" />
          {showLabel && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="size-4 text-[var(--primary)] shrink-0" />
          {showLabel && <span>Dark Mode</span>}
        </>
      )}
      <span className="sr-only">
        {isDark ? "Switch to light theme" : "Switch to dark theme"}
      </span>
    </button>
  );
}
