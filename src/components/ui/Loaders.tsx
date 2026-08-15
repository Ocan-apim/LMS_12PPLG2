import { Loader2 } from "lucide-react";

export function Spinner({
  label = "Memuat",
  size = "md",
  className = "",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    sm: "size-4",
    md: "size-5",
    lg: "size-7",
  }[size];

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 text-sm text-[var(--muted)] ${className}`}
    >
      <Loader2 className={`${sizeClass} animate-spin`} />
      <span>{label}</span>
    </span>
  );
}

export function Skeleton({
  className = "",
  rounded = "md",
}: {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}) {
  const roundedClass = {
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200 ${roundedClass} ${className}`}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <div className="grid gap-px bg-[var(--border)]" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={`head-${index}`} className="bg-[var(--background)] p-4">
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
        {Array.from({ length: rows * columns }).map((_, index) => (
          <div key={`cell-${index}`} className="bg-white p-4">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  );
}
