import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-black/30 px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-white focus:ring-1 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
}
