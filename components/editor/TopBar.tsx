"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Undo2,
  Redo2,
  Share2,
  Download,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";
import { ASPECT_RATIOS } from "@/lib/editor/types";
import type { AspectRatio } from "@/lib/editor/types";

export default function TopBar() {
  const projectTitle = useEditorStore((s) => s.projectTitle);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const aspectRatio = useEditorStore((s) => s.aspectRatio);
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const togglePlay = useEditorStore((s) => s.togglePlay);

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--ed-border-subtle)] bg-[var(--ed-surface)] px-3">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Link
          href="/editor"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] transition hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-4 w-px bg-[var(--ed-border)]" />
        <span className="text-sm font-medium">{projectTitle}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-[var(--ed-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ed-success)]" />
          Saved
        </span>
      </div>

      {/* Center */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => useEditorStore.temporal.getState().undo()}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] transition hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-primary)]"
          title="Undo (⌘Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => useEditorStore.temporal.getState().redo()}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] transition hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-primary)]"
          title="Redo (⌘⇧Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <div className="mx-2 h-4 w-px bg-[var(--ed-border)]" />
        <select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-8 rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] px-2 text-xs text-[var(--ed-text-secondary)]"
        >
          {[50, 75, 100, 125, 150, 200].map((v) => (
            <option key={v} value={v}>{v}%</option>
          ))}
        </select>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
          className="h-8 rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] px-2 text-xs text-[var(--ed-text-secondary)]"
        >
          {(Object.entries(ASPECT_RATIOS) as [AspectRatio, { label: string }][]).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <div className="mx-1 h-4 w-px bg-[var(--ed-border)]" />
        <button
          onClick={togglePlay}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-primary)] transition hover:bg-[var(--ed-surface-muted)]"
          title="Play/Pause (Space)"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="flex h-8 items-center gap-1.5 rounded-[var(--ed-radius-sm)] px-3 text-xs text-[var(--ed-text-muted)] transition hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-primary)]">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-export-modal"))}
          className="flex h-8 items-center gap-1.5 rounded-[var(--ed-radius-sm)] bg-[var(--ed-accent)] px-4 text-xs font-medium text-white transition hover:bg-[var(--ed-accent-hover)]"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}
