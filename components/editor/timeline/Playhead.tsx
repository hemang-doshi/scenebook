"use client";

import { useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/editor-store";

interface Props {
  pixelsPerSecond: number;
  containerHeight: number;
}

export default function Playhead({ pixelsPerSecond, containerHeight }: Props) {
  const playhead = useEditorStore((s) => s.playhead);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dragRef.current = { startX: e.clientX, startTime: playhead };
      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = me.clientX - dragRef.current.startX;
        const dt = dx / pixelsPerSecond;
        setPlayhead(Math.max(0, dragRef.current.startTime + dt));
      };
      const handleUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [playhead, pixelsPerSecond, setPlayhead],
  );

  const left = playhead * pixelsPerSecond;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left, top: 0, height: 24 + containerHeight }}
    >
      {/* Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="pointer-events-auto relative -left-[5px] h-3 w-[10px] cursor-ew-resize"
        style={{
          background: "var(--ed-timeline-playhead)",
          clipPath: "polygon(0 0, 100% 0, 50% 100%)",
        }}
      />
      {/* Line */}
      <div
        className="w-[1.5px]"
        style={{ height: containerHeight, background: "var(--ed-timeline-playhead)" }}
      />
    </div>
  );
}
