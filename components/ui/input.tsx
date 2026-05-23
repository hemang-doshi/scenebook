import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-border bg-white/65 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/45 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}
