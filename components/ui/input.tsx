import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel-2)_72%,transparent)] px-3.5 py-3 text-sm leading-relaxed text-[var(--ink)] outline-none transition-[border-color,background,color,box-shadow] duration-[var(--sb-motion-fast)] placeholder:text-[var(--muted-2)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20 focus-visible:border-[var(--blue)] focus-visible:ring-2 focus-visible:ring-[var(--blue)]/30 disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[color-mix(in_srgb,var(--panel-3)_48%,transparent)] disabled:text-[var(--muted-2)]",
        className,
      )}
      {...props}
    />
  );
}
