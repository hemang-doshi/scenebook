import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] px-3.5 py-3 text-[18px] font-[320] leading-[1.45] tracking-[-0.26px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:ring-1 focus:ring-[var(--ink)]/10",
        className,
      )}
      {...props}
    />
  );
}
