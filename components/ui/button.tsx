import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border border-[var(--white)] bg-[var(--white)] text-[var(--black)] hover:border-[var(--white)] hover:bg-[var(--ink-soft)]",
  coral:
    "border border-[var(--coral)] bg-[var(--coral)] text-[var(--black)] hover:border-[var(--coral-2)] hover:bg-[var(--coral-2)]",
  secondary:
    "border border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--panel-2)_72%,transparent)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[color-mix(in_srgb,var(--white)_8%,transparent)]",
  dark:
    "border border-[var(--black)] bg-[var(--black)] text-[var(--white)] hover:border-[var(--line-strong)] hover:bg-[var(--panel-3)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--ink)] hover:border-[var(--line)] hover:bg-[color-mix(in_srgb,var(--white)_6%,transparent)]",
  ghostLight:
    "border border-transparent bg-transparent text-[var(--light-ink)] hover:border-[color-mix(in_srgb,var(--black)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--black)_6%,transparent)]",
  danger:
    "border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_22%,transparent)]",
  success:
    "border border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_20%,transparent)]",
  warning:
    "border border-[var(--amber)] bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] text-[var(--amber)] hover:bg-[color-mix(in_srgb,var(--amber)_22%,transparent)]",
  runtime:
    "border border-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_16%,transparent)] text-[var(--blue-2)] hover:bg-[color-mix(in_srgb,var(--blue)_24%,transparent)]",
  model:
    "border border-[var(--violet)] bg-[color-mix(in_srgb,var(--violet)_14%,transparent)] text-[var(--violet)] hover:bg-[color-mix(in_srgb,var(--violet)_22%,transparent)]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-pill)] px-[17px] py-[11px] text-[13px] font-semibold leading-none whitespace-nowrap transition-[transform,border-color,background,color] duration-[var(--sb-motion-fast)] ease-[var(--sb-ease)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
