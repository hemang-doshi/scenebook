import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  neutral:
    "border-[var(--line)] bg-[color-mix(in_srgb,var(--panel-2)_72%,transparent)] text-[var(--muted)]",
  creative:
    "border-[var(--coral)] bg-[color-mix(in_srgb,var(--coral)_14%,transparent)] text-[var(--coral-2)]",
  runtime:
    "border-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] text-[var(--blue-2)]",
  applied:
    "border-[var(--lime)] bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] text-[var(--lime)]",
  model:
    "border-[var(--violet)] bg-[color-mix(in_srgb,var(--violet)_12%,transparent)] text-[var(--violet)]",
  warning:
    "border-[var(--amber)] bg-[color-mix(in_srgb,var(--amber)_12%,transparent)] text-[var(--amber)]",
  danger:
    "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
  muted:
    "border-[var(--line)] bg-transparent text-[var(--muted-2)]",
  outline:
    "border-[var(--line-strong)] bg-transparent text-[var(--ink)]",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[.07em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
