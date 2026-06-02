import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.055)] px-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
