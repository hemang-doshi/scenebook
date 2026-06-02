import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.055)] px-3.5 py-3 text-sm leading-relaxed text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20",
        className,
      )}
      {...props}
    />
  );
}
