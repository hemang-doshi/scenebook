import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-black/10 px-6 py-10 text-center",
        className,
      )}
      {...props}
    />
  );
}
