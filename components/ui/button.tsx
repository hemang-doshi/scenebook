import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border border-[var(--white)] bg-[var(--white)] text-[var(--black)] hover:border-[var(--white)] hover:bg-[var(--ink-soft)]",
  coral:
    "border border-[var(--coral)] bg-[var(--coral)] text-[#120a07] hover:border-[var(--coral-2)] hover:bg-[var(--coral-2)]",
  secondary:
    "border border-[var(--line-strong)] bg-[rgba(255,255,255,.055)] text-[var(--ink)] hover:border-[rgba(255,255,255,.32)] hover:bg-[rgba(255,255,255,.09)]",
  dark:
    "border border-[#090b10] bg-[#090b10] text-[var(--white)] hover:border-[var(--black)] hover:bg-[var(--black)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--ink)] hover:border-[var(--line)] hover:bg-[rgba(255,255,255,.055)]",
  ghostLight:
    "border border-transparent bg-transparent text-[var(--light-ink)] hover:border-[rgba(17,19,24,.12)] hover:bg-[rgba(17,19,24,.055)]",
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
