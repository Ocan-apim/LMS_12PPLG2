import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function WelcomeBanner({
  name,
  subtitle,
}: {
  name: string;
  subtitle: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--sidebar)] to-[var(--primary)] p-6 text-white shadow-[var(--shadow)] md:p-8">
      <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 right-16 size-28 rounded-full bg-[var(--accent)]/30" />
      <div className="relative">
        <p className="text-sm text-blue-100">Selamat datang kembali</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold md:text-3xl">
          Halo, {name}!
        </h2>
        <p className="mt-2 max-w-xl text-sm text-blue-100 md:text-base">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "blue" | "purple" | "orange" | "green";
}) {
  const accentMap = {
    blue: "bg-[var(--primary-soft)] text-[var(--primary)]",
    purple: "bg-[var(--secondary-soft)] text-[var(--secondary)]",
    orange: "bg-[var(--accent-soft)] text-[var(--accent)]",
    green: "bg-green-100 text-green-700",
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
      <div
        className={`mb-4 inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${accentMap[accent]}`}
      >
        {label}
      </div>
      <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function ClassCard({
  title,
  subtitle,
  progress,
  badge,
}: {
  title: string;
  subtitle: string;
  progress?: number;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        </div>
        {badge ? (
          <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
            {badge}
          </span>
        ) : null}
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ActivityList({
  items,
}: {
  items: { title: string; time: string; type: string }[];
}) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <div key={`${item.title}-${item.time}`} className="flex gap-3 py-3">
          <div className="mt-1 size-2 shrink-0 rounded-full bg-[var(--primary)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {item.title}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {item.type} · {item.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlaceholderTable({
  columns,
  rows = [],
}: {
  columns: string[];
  rows?: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--background)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 font-semibold text-[var(--muted)]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-[var(--muted)]"
              >
                Belum ada data. Siap dihubungkan ke MongoDB.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={`${row[0]}-${index}`}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/60"
              >
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-[var(--shadow)]">
      <h4 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h4>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
        {description}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
