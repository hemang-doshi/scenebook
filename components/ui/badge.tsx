import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--rounded-sm)] bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.40px] text-[var(--ink)] border border-[var(--hairline)]",
        className,
      )}
      {...props}
    />
  );
}
