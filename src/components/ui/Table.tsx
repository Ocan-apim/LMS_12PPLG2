import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode, TableHTMLAttributes, ThHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";

export function Table({
  children,
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow)]">
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-[var(--border)] bg-[var(--background)]">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[var(--border)]">{children}</tbody>;
}

export function TableRow({
  children,
  interactive = false,
}: {
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <tr className={interactive ? "transition hover:bg-[var(--background)]/70" : ""}>
      {children}
    </tr>
  );
}

type SortDirection = "asc" | "desc" | null;

type SortableHeaderProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
  sorted?: SortDirection;
  onSort?: () => void;
};

export function SortableHeader({
  children,
  sorted = null,
  onSort,
  className = "",
  ...props
}: SortableHeaderProps) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] ${className}`}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1.5 rounded-md py-1 text-left transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-soft)]"
      >
        {children}
        <Icon className="size-3.5" />
      </button>
    </th>
  );
}

export function TableHeadCell({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-[var(--foreground)] ${className}`}>{children}</td>;
}

export function TableEmpty({
  colSpan,
  title,
  description = "Data akan tampil di sini setelah tersedia.",
}: {
  colSpan: number;
  title: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </td>
    </tr>
  );
}

export function Pagination({
  page,
  pageCount,
  onPrevious,
  onNext,
  label,
}: {
  page: number;
  pageCount: number;
  onPrevious?: () => void;
  onNext?: () => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-white px-4 py-3 text-sm">
      <p className="text-[var(--muted)]">
        {label ?? `Halaman ${page} dari ${Math.max(pageCount, 1)}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={onPrevious}
        >
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={onNext}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
