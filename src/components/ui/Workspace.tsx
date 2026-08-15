import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

type Tone = "blue" | "purple" | "orange" | "green";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[var(--primary)]",
  purple: "bg-violet-50 text-[var(--secondary)]",
  orange: "bg-orange-50 text-[var(--accent)]",
  green: "bg-green-50 text-[var(--success)]",
};

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow)] md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function DashboardHero({
  title,
  subtitle,
  meta,
  action,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-[var(--sidebar)] text-white shadow-[var(--shadow-strong)]">
      <div className="grid gap-6 px-6 py-6 md:grid-cols-[1fr_280px] md:p-8">
        <div>
          {meta ? (
            <Badge variant="orange">{meta}</Badge>
          ) : null}
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 md:text-base">
            {subtitle}
          </p>
          {action ? <div className="mt-6">{action}</div> : null}
        </div>
        <div className="hidden rounded-lg border border-white/15 bg-white/10 p-4 md:block">
          <div className="space-y-3">
            {["Materi baru", "Tugas aktif", "Progress kelas"].map((item, index) => (
              <div key={item} className="rounded-md bg-white/10 px-3 py-2">
                <p className="text-xs text-blue-100">Ringkasan {index + 1}</p>
                <p className="text-sm font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <Card className="rounded-lg">
      <CardBody>
        <div className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
          {label}
        </div>
        <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
          {value}
        </p>
        {hint ? <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

export function CourseProgressCard({
  title,
  subtitle,
  progress,
  status,
  actionLabel = "Buka",
}: {
  title: string;
  subtitle: string;
  progress: number;
  status: string;
  actionLabel?: string;
}) {
  return (
    <Card className="rounded-lg transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          <Badge variant="blue">{status}</Badge>
        </div>
        <div className="mt-5">
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Button className="mt-5 w-full" variant="outline" size="sm">
          {actionLabel}
        </Button>
      </CardBody>
    </Card>
  );
}

export function ActionToolbar({
  search,
  filters,
}: {
  search?: ReactNode;
  filters?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-white p-3 shadow-[var(--shadow)] md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">{search}</div>
      {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
    </div>
  );
}

export function MiniBarChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  return (
    <div className="flex h-44 items-end gap-3">
      {values.map((value, index) => (
        <div key={`${labels[index]}-${value}`} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-36 w-full items-end rounded-md bg-slate-100">
            <div
              className="w-full rounded-md bg-[var(--secondary)]"
              style={{ height: `${value}%` }}
            />
          </div>
          <span className="text-xs text-[var(--muted)]">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}
