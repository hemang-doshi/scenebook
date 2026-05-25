"use client";

import { useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "@/lib/editor/editor-store";
import type { Clip } from "@/lib/editor/types";

interface Props {
  clip: Clip;
  pixelsPerSecond: number;
}

export default function TimelineClip({ clip, pixelsPerSecond }: Props) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);
  const trimClip = useEditorStore((s) => s.trimClip);
  const isSelected = selectedClipId === clip.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id });

  const trimRef = useRef<{ side: "left" | "right"; startX: number; startTime: number; startDuration: number } | null>(null);

  const handleTrimStart = useCallback(
    (e: React.MouseEvent, side: "left" | "right") => {
      e.stopPropagation();
      trimRef.current = { side, startX: e.clientX, startTime: clip.startTime, startDuration: clip.duration };
      const handleMove = (me: MouseEvent) => {
        if (!trimRef.current) return;
        const dx = me.clientX - trimRef.current.startX;
        const dt = dx / pixelsPerSecond;
        if (trimRef.current.side === "right") {
          trimClip(clip.id, Math.max(0.5, trimRef.current.startDuration + dt));
        } else {
          const newStart = Math.max(0, trimRef.current.startTime + dt);
          const newDuration = trimRef.current.startDuration - (newStart - trimRef.current.startTime);
          if (newDuration > 0.5) trimClip(clip.id, newDuration, newStart);
        }
      };
      const handleUp = () => {
        trimRef.current = null;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [clip.id, clip.startTime, clip.duration, pixelsPerSecond, trimClip],
  );

  const width = Math.max(30, clip.duration * pixelsPerSecond);
  const left = clip.startTime * pixelsPerSecond;
  const dur = clip.duration >= 1 ? `${clip.duration.toFixed(1)}s` : `${(clip.duration * 1000).toFixed(0)}ms`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    left,
    width,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); selectClip(clip.id); }}
      className={`group absolute top-[6px] flex h-9 cursor-grab items-center overflow-hidden rounded-[var(--ed-radius-sm)] px-1.5 transition-shadow ${isDragging ? "z-20 cursor-grabbing opacity-70 shadow-lg" : ""} ${isSelected ? "ring-2 ring-[var(--ed-accent)] ring-offset-1 ring-offset-[var(--ed-timeline-track)]" : ""}`}
      style={{ ...style, background: clip.color }}
    >
      {/* Left trim handle */}
      <div
        onMouseDown={(e) => handleTrimStart(e, "left")}
        className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize opacity-0 transition group-hover:opacity-100"
        style={{ background: "var(--ed-accent)" }}
      />
      {/* Content */}
      <span className="truncate text-[10px] font-medium text-white/80">{clip.title}</span>
      <span className="ml-auto shrink-0 text-[9px] text-white/50">{dur}</span>
      {/* Right trim handle */}
      <div
        onMouseDown={(e) => handleTrimStart(e, "right")}
        className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize opacity-0 transition group-hover:opacity-100"
        style={{ background: "var(--ed-accent)" }}
      />
    </div>
  );
}
