"use client";
import { useState } from "react";
import { useEditorStore } from "@/lib/editor/editor-store";

const categories = ["All", "Shapes", "Stickers", "Overlays", "Borders"];
const elements = [
  { id: "e1", name: "Circle", css: "rounded-full bg-[var(--ed-accent)]/30 border border-[var(--ed-accent)]" },
  { id: "e2", name: "Rectangle", css: "rounded-sm bg-[var(--ed-timeline-clip-video)] border border-[var(--ed-accent)]/30" },
  { id: "e3", name: "Rounded Rect", css: "rounded-lg bg-[var(--ed-timeline-clip-text)] border border-[var(--ed-accent)]/30" },
  { id: "e4", name: "Star", css: "rounded-sm bg-amber-500/20 border border-amber-500/40" },
  { id: "e5", name: "Arrow", css: "rounded-sm bg-emerald-500/20 border border-emerald-500/40" },
  { id: "e6", name: "Line", css: "rounded-sm bg-cyan-500/20 border border-cyan-500/40" },
  { id: "e7", name: "Triangle", css: "rounded-sm bg-pink-500/20 border border-pink-500/40" },
  { id: "e8", name: "Hexagon", css: "rounded-sm bg-violet-500/20 border border-violet-500/40" },
];

export default function ElementsPanel() {
  const [active, setActive] = useState("All");
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto ed-scrollbar pb-1">
        {categories.map((c) => (
          <button key={c} onClick={() => setActive(c)} className={`shrink-0 rounded-[var(--ed-radius-sm)] px-2.5 py-1 text-[10px] font-medium transition ${active === c ? "bg-[var(--ed-accent)] text-white" : "bg-[var(--ed-surface-muted)] text-[var(--ed-text-muted)]"}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {elements.map((el) => (
          <button key={el.id} onClick={() => addCanvasObject("image", el.name)} className="flex flex-col items-center gap-1.5 rounded-[var(--ed-radius-md)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] p-3 transition hover:border-[var(--ed-accent)]/40">
            <div className={`h-10 w-10 ${el.css}`} />
            <span className="text-[9px] text-[var(--ed-text-muted)]">{el.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
