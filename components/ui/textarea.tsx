import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-3xl border border-border bg-white/65 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/45 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}
