import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--line)] bg-[rgba(255,255,255,.055)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[.07em] text-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}
