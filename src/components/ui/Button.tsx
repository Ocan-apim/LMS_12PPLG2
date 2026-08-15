import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "text"
  | "icon"
  | "accent"
  | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--sidebar-dark)]",
  secondary:
    "bg-[var(--secondary)] text-white shadow-sm hover:bg-violet-700 active:bg-violet-800",
  outline:
    "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--background)] active:bg-slate-200",
  ghost:
    "text-[var(--foreground)] hover:bg-[var(--primary-soft)] active:bg-blue-100",
  text: "px-0 text-[var(--primary)] hover:text-[var(--primary-hover)] active:text-[var(--sidebar-dark)]",
  icon:
    "border border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] active:bg-slate-200",
  accent:
    "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)] active:bg-orange-700",
  danger: "bg-[var(--danger)] text-white shadow-sm hover:bg-red-700 active:bg-red-800",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
  icon: "size-10 p-0",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const buttonSize = variant === "icon" ? "icon" : size;

  return (
    <button
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[7px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary-soft)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${sizeClasses[buttonSize]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : leftIcon}
      {children}
      {!loading ? rightIcon : null}
    </button>
  );
}
