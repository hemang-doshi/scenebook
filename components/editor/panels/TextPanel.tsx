"use client";
import { Type } from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";

const presets = [
  { label: "Bold Title", size: "text-lg", weight: "font-bold" },
  { label: "Minimal Caption", size: "text-xs", weight: "font-light" },
  { label: "Lower Third", size: "text-sm", weight: "font-medium" },
  { label: "Kinetic Type", size: "text-base", weight: "font-black" },
];

export default function TextPanel() {
  const addClip = useEditorStore((s) => s.addClip);
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);
  const tracks = useEditorStore((s) => s.tracks);

  const handleAddText = (label: string) => {
    const textTrack = tracks.find((t) => t.type === "text");
    if (textTrack) addClip(textTrack.id, "text", label, 4);
    addCanvasObject("text", label);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Add Text</p>
        <div className="space-y-1.5">
          {["Add Heading", "Add Subheading", "Add Body Text"].map((label) => (
            <button key={label} onClick={() => handleAddText(label.replace("Add ", ""))} className="flex w-full items-center gap-2 rounded-[var(--ed-radius-sm)] bg-[var(--ed-surface-muted)] px-3 py-2 text-xs font-medium transition hover:bg-[var(--ed-surface-raised)]">
              <Type className="h-3.5 w-3.5 text-[var(--ed-text-muted)]" /> {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Text Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => (
            <button key={p.label} onClick={() => handleAddText(p.label)} className="flex flex-col items-center justify-center rounded-[var(--ed-radius-md)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] p-3 transition hover:border-[var(--ed-accent)]/40">
              <span className={`${p.size} ${p.weight} mb-1`}>Aa</span>
              <span className="text-[9px] text-[var(--ed-text-muted)]">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
