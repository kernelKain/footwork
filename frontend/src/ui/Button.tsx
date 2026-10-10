import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";

export function Button({
  variant = "primary",
  loading = false,
  children,
  disabled,
  ...props
}: {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`ui-button ui-button-${variant}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Working" : children}
    </button>
  );
}
