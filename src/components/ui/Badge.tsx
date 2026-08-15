import type { ReactNode } from "react";

type BadgeVariant = "blue" | "purple" | "orange" | "green" | "gray";

const styles: Record<BadgeVariant, string> = {
  blue: "bg-[var(--primary-soft)] text-[var(--primary)]",
  purple: "bg-[var(--secondary-soft)] text-[var(--secondary)]",
  orange: "bg-[var(--accent-soft)] text-[var(--accent)]",
  green: "bg-green-100 text-green-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({
  children,
  variant = "blue",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
