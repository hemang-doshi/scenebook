"use client";
import { useState } from "react";
import { Sparkles, Upload } from "lucide-react";

const styles = ["Default", "Highlighted", "Karaoke", "Bold Pop"];
const highlights = ["None", "Color", "Background"];

export default function CaptionsPanel() {
  const [activeStyle, setActiveStyle] = useState("Default");
  const [activeHighlight, setActiveHighlight] = useState("None");
  return (
    <div className="space-y-4">
      <button className="flex w-full items-center justify-center gap-2 rounded-[var(--ed-radius-md)] bg-[var(--ed-accent)] py-2.5 text-xs font-medium text-white transition hover:bg-[var(--ed-accent-hover)]">
        <Sparkles className="h-3.5 w-3.5" /> Auto Generate
      </button>
      <button className="flex w-full items-center justify-center gap-2 rounded-[var(--ed-radius-md)] border border-[var(--ed-border)] bg-transparent py-2 text-xs text-[var(--ed-text-muted)] transition hover:bg-[var(--ed-surface-muted)]">
        <Upload className="h-3.5 w-3.5" /> Import SRT
      </button>
      <div className="h-px bg-[var(--ed-border-subtle)]" />
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Caption Styles</p>
        <div className="grid grid-cols-2 gap-2">
          {styles.map((s) => (
            <button key={s} onClick={() => setActiveStyle(s)} className={`rounded-[var(--ed-radius-md)] border p-3 text-center text-[10px] font-medium transition ${activeStyle === s ? "border-[var(--ed-accent)] bg-[var(--ed-accent-soft)] text-[var(--ed-accent)]" : "border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] text-[var(--ed-text-secondary)]"}`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Word Highlight</p>
        <div className="flex gap-1.5">
          {highlights.map((h) => (
            <button key={h} onClick={() => setActiveHighlight(h)} className={`flex-1 rounded-[var(--ed-radius-sm)] py-1 text-[10px] font-medium transition ${activeHighlight === h ? "bg-[var(--ed-accent)] text-white" : "bg-[var(--ed-surface-muted)] text-[var(--ed-text-muted)]"}`}>{h}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
