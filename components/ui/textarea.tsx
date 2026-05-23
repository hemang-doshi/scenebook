import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-border bg-black/30 px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-white focus:ring-1 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
}
