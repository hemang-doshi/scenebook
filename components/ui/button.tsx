import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[#222] active:scale-[0.97]",
  secondary:
    "bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] hover:border-[var(--ink)] active:scale-[0.97]",
  ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-soft)]",
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
        "inline-flex h-9 items-center justify-center rounded-[var(--rounded-md)] px-4 text-xs font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/20 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
