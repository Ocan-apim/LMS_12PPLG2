"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type LearnixTheme = "light" | "dark";

interface ThemeContextValue {
  theme: LearnixTheme;
  setTheme: (next: LearnixTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "learnix-theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeToDOM(theme: LearnixTheme, isLandingPage: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="color-scheme"]');

  // Task 8: Public Landing Page (/) MUST remain in light mode and completely unchanged
  const effectiveTheme: LearnixTheme = isLandingPage ? "light" : theme;

  if (effectiveTheme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    if (meta) meta.setAttribute("content", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    if (meta) meta.setAttribute("content", "light");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  const [theme, setThemeState] = useState<LearnixTheme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      // ignore storage errors
    }
    return "light";
  });

  // Synchronize external DOM attributes whenever pathname or theme changes
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const activeTheme: LearnixTheme =
        saved === "dark" || saved === "light" ? saved : theme;
      applyThemeToDOM(activeTheme, isLandingPage);
    } catch {
      applyThemeToDOM(theme, isLandingPage);
    }
  }, [isLandingPage, theme]);

  // Keep tabs synchronized via storage event
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        const next: LearnixTheme = e.newValue === "dark" ? "dark" : "light";
        setThemeState(next);
        applyThemeToDOM(next, pathname === "/");
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [pathname]);

  const setTheme = useCallback(
    (next: LearnixTheme) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      applyThemeToDOM(next, pathname === "/");
    },
    [pathname]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
