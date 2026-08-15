"use client";

import { AlertCircle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Tone = "success" | "error" | "warning" | "info";

const toneStyles: Record<
  Tone,
  { wrapper: string; icon: React.ComponentType<{ className?: string }> }
> = {
  success: {
    wrapper: "border-green-200 bg-green-50 text-green-800",
    icon: CheckCircle2,
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-800",
    icon: XCircle,
  },
  warning: {
    wrapper: "border-orange-200 bg-orange-50 text-orange-800",
    icon: AlertCircle,
  },
  info: {
    wrapper: "border-blue-200 bg-blue-50 text-blue-800",
    icon: Info,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = toneStyles[tone].icon;

  return (
    <div
      role="status"
      className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${toneStyles[tone].wrapper}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100"
          aria-label="Tutup notifikasi"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export type Toast = {
  id: string;
  tone: Tone;
  title: string;
  message?: string;
  loading?: boolean;
};

type ToastContextValue = {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }]);

      if (!toast.loading) {
        window.setTimeout(() => dismissToast(id), 4500);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast }),
    [dismissToast, pushToast, toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToasts must be used inside ToastProvider");
  }
  return context;
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toast.loading ? Loader2 : toneStyles[toast.tone].icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`flex gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg ${toneStyles[toast.tone].wrapper}`}
          >
            <Icon
              className={`mt-0.5 size-4 shrink-0 ${toast.loading ? "animate-spin" : ""}`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{toast.title}</p>
              {toast.message ? (
                <p className="mt-1 opacity-90">{toast.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100"
              aria-label="Tutup toast"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
