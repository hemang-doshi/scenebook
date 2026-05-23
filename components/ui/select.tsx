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
        "h-12 w-full rounded-2xl border border-border bg-white/65 px-4 text-sm text-foreground outline-none transition focus:border-accent/45 focus:bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
