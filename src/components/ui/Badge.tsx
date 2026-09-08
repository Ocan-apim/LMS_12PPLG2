import type { ReactNode } from "react";

type BadgeVariant = "blue" | "purple" | "orange" | "green" | "gray" | "red";

const styles: Record<BadgeVariant, string> = {
  blue: "bg-[var(--primary-soft)] text-[var(--primary)]",
  purple: "bg-[var(--secondary-soft)] text-[var(--secondary)]",
  orange: "bg-[var(--accent-soft)] text-[var(--accent)]",
  green: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export function Badge({
  children,
  variant = "blue",
  className = "",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
