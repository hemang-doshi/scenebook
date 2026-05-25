"use client";

import { cn } from "@/lib/utils";

export function RetroGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden opacity-25 [perspective:200px]",
        className,
      )}
    >
      <div className="absolute inset-0 [transform:rotateX(60deg)]">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [background-repeat:repeat] [height:300%] [width:100%] [transform-origin:top_center] animate-[grid-scroll_24s_linear_infinite]"
          style={{
            animationName: "grid-scroll",
            animationDuration: "25s",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
    </div>
  );
}
