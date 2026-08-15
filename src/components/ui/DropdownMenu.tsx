"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type DropdownAlign = "start" | "end";

export type DropdownMenuItem = {
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
};

type DropdownMenuProps = {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: DropdownAlign;
  className?: string;
};

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  className = "",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <span
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="contents"
      >
        {trigger}
      </span>

      {open ? (
        <div
          role="menu"
          className={`absolute top-full z-30 mt-2 w-64 rounded-lg border border-[var(--border)] bg-white p-1.5 shadow-lg ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect?.();
                setOpen(false);
              }}
              className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger
                  ? "text-[var(--danger)] hover:bg-red-50"
                  : "text-[var(--foreground)] hover:bg-[var(--background)]"
              }`}
            >
              {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
