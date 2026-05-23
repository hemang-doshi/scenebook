import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("cmd-panel rounded-xl p-5", className)} {...props} />;
}
