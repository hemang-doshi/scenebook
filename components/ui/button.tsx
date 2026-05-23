import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-accent text-accent-foreground hover:brightness-110 shadow-[0_0_18px_rgba(212,255,51,0.18)]",
  secondary:
    "border border-border bg-transparent text-foreground hover:border-white hover:bg-white/5",
  ghost: "bg-transparent text-muted hover:bg-white/5 hover:text-foreground",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
