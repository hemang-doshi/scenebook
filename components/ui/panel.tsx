import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  default:
    "border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_86%,transparent)] text-[var(--ink)]",
  floating:
    "border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--panel-2)_90%,transparent)] text-[var(--ink)]",
  review:
    "border-[var(--line)] bg-[var(--bone)] text-[var(--light-ink)]",
  danger:
    "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,var(--panel))] text-[var(--ink)]",
  success:
    "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,var(--panel))] text-[var(--ink)]",
};

export function Panel({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof variants;
}) {
  const hasShadowOverride = className?.includes("shadow-");
  const shouldElevate = (variant === "floating" || variant === "review") && !hasShadowOverride;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-6",
        variants[variant],
        shouldElevate && "shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
