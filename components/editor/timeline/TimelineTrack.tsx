"use client";

import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Track, Clip } from "@/lib/editor/types";
import TimelineClip from "./TimelineClip";

interface Props {
  track: Track;
  clips: Clip[];
  pixelsPerSecond: number;
}

export default function TimelineTrack({ track, clips, pixelsPerSecond }: Props) {
  const { setNodeRef } = useDroppable({ id: track.id });

  return (
    <div
      ref={setNodeRef}
      className="relative h-12 border-b border-[var(--ed-border-subtle)] bg-[var(--ed-timeline-track)]"
    >
      <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
        {clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} pixelsPerSecond={pixelsPerSecond} />
        ))}
      </SortableContext>
    </div>
  );
}
