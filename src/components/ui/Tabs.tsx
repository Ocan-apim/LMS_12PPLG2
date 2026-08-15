"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type TabItem = {
  value: string;
  label: string;
  href?: string;
  count?: number;
  icon?: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function Tabs({ items, value, onValueChange, className = "" }: TabsProps) {
  const pathname = usePathname();

  return (
    <div
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-white p-1 ${className}`}
      role="tablist"
    >
      {items.map((item) => {
        const active =
          value === item.value ||
          Boolean(item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)));

        const classNames = `inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-[var(--primary)] text-white shadow-sm"
            : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        }`;

        const content = (
          <>
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.value}
              href={item.href}
              role="tab"
              aria-selected={active}
              className={classNames}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange?.(item.value)}
            className={classNames}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
