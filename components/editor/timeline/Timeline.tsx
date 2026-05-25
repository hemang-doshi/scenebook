"use client";

import { useMemo, useRef, useState } from "react";
import {
  Play, Pause, Scissors, Plus, Minus, ChevronDown,
  Volume2, VolumeX, Lock, Unlock, X,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useEditorStore } from "@/lib/editor/editor-store";
import TimelineRuler from "./TimelineRuler";
import TimelineTrack from "./TimelineTrack";
import Playhead from "./Playhead";

export default function Timeline() {
  const tracks = useEditorStore((s) => s.tracks);
  const clips = useEditorStore((s) => s.clips);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const splitClipAtPlayhead = useEditorStore((s) => s.splitClipAtPlayhead);
  const timelineZoom = useEditorStore((s) => s.timelineZoom);
  const setTimelineZoom = useEditorStore((s) => s.setTimelineZoom);
  const toggleTimeline = useEditorStore((s) => s.toggleTimeline);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const addTrack = useEditorStore((s) => s.addTrack);
  const removeTrack = useEditorStore((s) => s.removeTrack);
  const moveClip = useEditorStore((s) => s.moveClip);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const pxPerSec = 80 * timelineZoom;

  const totalDuration = useMemo(() => {
    const maxEnd = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    return Math.max(30, maxEnd + 5);
  }, [clips]);

  const totalWidth = totalDuration * pxPerSec + 200;
  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const clipId = String(active.id);
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const overTrackId = String(over.id).startsWith("track-") ? String(over.id) : clip.trackId;
    moveClip(clipId, overTrackId, clip.startTime);
  };



  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-[var(--ed-border)] bg-[var(--ed-timeline-bg)]">
      {/* Toolbar */}
      <div className="flex h-10 items-center justify-between border-b border-[var(--ed-border-subtle)] px-3">
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="flex h-7 w-7 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-surface-muted)]">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <span className="font-mono text-[11px] text-[var(--ed-text-secondary)]">{formatTime(playhead)}</span>
          <div className="h-4 w-px bg-[var(--ed-border)]" />
          <button onClick={splitClipAtPlayhead} title="Split (S)" className="flex h-7 w-7 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-primary)]">
            <Scissors className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowAddMenu(!showAddMenu)} className="flex h-7 items-center gap-1 rounded-[var(--ed-radius-sm)] px-2 text-[10px] text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)]">
              <Plus className="h-3 w-3" /> Add Track
            </button>
            {showAddMenu && (
              <div className="absolute left-0 top-8 z-30 rounded-[var(--ed-radius-md)] border border-[var(--ed-border)] bg-[var(--ed-surface-raised)] py-1 shadow-xl">
                {([["video", "Video Track"], ["text", "Text Track"], ["audio", "Audio Track"]] as const).map(([type, label]) => (
                  <button key={type} onClick={() => { addTrack(type, `${type.charAt(0).toUpperCase()}${tracks.filter((t) => t.type === type).length + 1}`); setShowAddMenu(false); }} className="flex w-full px-3 py-1.5 text-[11px] text-[var(--ed-text-secondary)] hover:bg-[var(--ed-surface-muted)]">{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="h-3 w-3 text-[var(--ed-text-muted)]" />
          <input type="range" min={0.25} max={4} step={0.25} value={timelineZoom} onChange={(e) => setTimelineZoom(Number(e.target.value))} className="w-20 accent-[var(--ed-accent)]" />
          <Plus className="h-3 w-3 text-[var(--ed-text-muted)]" />
          <button onClick={toggleTimeline} className="ml-2 flex h-7 w-7 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)]">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tracks area */}
      <div className="flex" style={{ height: 24 + tracks.length * 48 }}>
        {/* Track labels */}
        <div className="w-28 shrink-0 bg-[var(--ed-surface)]">
          <div className="h-6" />
          {tracks.map((track) => (
            <div key={track.id} className="flex h-12 items-center justify-between border-b border-[var(--ed-border-subtle)] px-2">
              <span className="text-[10px] font-medium text-[var(--ed-text-secondary)]">{track.label}</span>
              <div className="flex items-center gap-0.5">
                <button className="flex h-5 w-5 items-center justify-center rounded text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]">
                  {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
                <button className="flex h-5 w-5 items-center justify-center rounded text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]">
                  {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </button>
                {tracks.length > 1 && (
                  <button onClick={() => removeTrack(track.id)} className="flex h-5 w-5 items-center justify-center rounded text-[var(--ed-text-muted)] hover:text-[var(--ed-danger)]">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable clip area */}
        <div ref={scrollRef} className="relative flex-1 overflow-x-auto overflow-y-hidden ed-scrollbar">
          <div style={{ width: totalWidth, minHeight: "100%" }}>
            <TimelineRuler totalDuration={totalDuration} pixelsPerSecond={pxPerSec} onClickPosition={(t) => setPlayhead(t)} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {tracks.map((track) => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  clips={clips.filter((c) => c.trackId === track.id)}
                  pixelsPerSecond={pxPerSec}
                />
              ))}
            </DndContext>
            <Playhead pixelsPerSecond={pxPerSec} containerHeight={tracks.length * 48} />
          </div>
        </div>
      </div>
    </div>
  );
}
