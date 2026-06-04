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

export function Card({
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
        "rounded-[var(--radius-lg)] border",
        variants[variant],
        shouldElevate && "shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-2xl font-bold leading-tight text-current", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-current", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
