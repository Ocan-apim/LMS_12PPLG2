import { Check, ChevronDown } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type FieldShellProps = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-sm text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function fieldClasses(error?: string, className = "") {
  return `w-full rounded-[5px] border bg-[#f4f6ff] px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
    error
      ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-red-100"
      : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary-soft)]"
  } ${className}`;
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TextField({
  label,
  hint,
  error,
  className = "",
  id,
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error}>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={fieldClasses(error, className)}
        {...props}
      />
    </FieldShell>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({
  label,
  hint,
  error,
  className = "",
  id,
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <FieldShell id={textareaId} label={label} hint={hint} error={error}>
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={fieldClasses(error, `resize-y ${className}`)}
        {...props}
      />
    </FieldShell>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
};

export function Select({
  label,
  hint,
  error,
  className = "",
  id,
  placeholder,
  options,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={Boolean(error)}
          className={`${fieldClasses(error, className)} appearance-none pr-10`}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
      </div>
    </FieldShell>
  );
}

type ChoiceProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  error?: string;
};

export function Checkbox({
  label,
  description,
  error,
  className = "",
  id,
  ...props
}: ChoiceProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label className="flex items-start gap-3 text-sm">
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            id={inputId}
            type="checkbox"
            aria-invalid={Boolean(error)}
            className={`peer size-5 appearance-none rounded border border-[var(--border)] bg-white transition checked:border-[var(--primary)] checked:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] disabled:opacity-60 ${className}`}
            {...props}
          />
          <Check className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100" />
        </span>
        <span>
          <span className="font-medium text-[var(--foreground)]">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-[var(--muted)]">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function Radio({
  label,
  description,
  error,
  className = "",
  id,
  ...props
}: ChoiceProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label className="flex items-start gap-3 text-sm">
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            id={inputId}
            type="radio"
            className={`peer size-5 appearance-none rounded-full border border-[var(--border)] bg-white transition checked:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] disabled:opacity-60 ${className}`}
            {...props}
          />
          <span className="pointer-events-none absolute size-2.5 rounded-full bg-[var(--primary)] opacity-0 peer-checked:opacity-100" />
        </span>
        <span>
          <span className="font-medium text-[var(--foreground)]">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-[var(--muted)]">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
