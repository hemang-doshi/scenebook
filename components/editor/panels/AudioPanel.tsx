"use client";
import { useState } from "react";
import { Search, Music, Plus } from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";

const categories = ["All", "Music", "SFX", "Ambient", "Voice"];
const audioItems = [
  { id: "a1", name: "Upbeat Indie", dur: "2:34" },
  { id: "a2", name: "Ambient Pad", dur: "3:12" },
  { id: "a3", name: "Whoosh SFX", dur: "0:02" },
  { id: "a4", name: "Soft Piano", dur: "1:45" },
];

export default function AudioPanel() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("All");
  const addClip = useEditorStore((s) => s.addClip);
  const tracks = useEditorStore((s) => s.tracks);

  const handleAdd = (item: typeof audioItems[0]) => {
    const audioTrack = tracks.find((t) => t.type === "audio");
    if (audioTrack) addClip(audioTrack.id, "audio", item.name, 15);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ed-text-muted)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audio..." className="h-8 w-full rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] pl-7 pr-2 text-xs" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto ed-scrollbar pb-1">
        {categories.map((c) => (
          <button key={c} onClick={() => setActive(c)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${active === c ? "bg-[var(--ed-accent)] text-white" : "bg-[var(--ed-surface-muted)] text-[var(--ed-text-muted)]"}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-1.5">
        {audioItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 rounded-[var(--ed-radius-sm)] bg-[var(--ed-surface-muted)] px-2.5 py-2 transition hover:bg-[var(--ed-surface-raised)]">
            <Music className="h-4 w-4 shrink-0 text-[var(--ed-text-muted)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{item.name}</p>
              <div className="mt-0.5 flex gap-[2px]">{Array.from({ length: 20 }).map((_, i) => (<span key={i} className="inline-block w-[3px] rounded-full bg-[var(--ed-accent)]/30" style={{ height: `${4 + Math.random() * 8}px` }} />))}</div>
            </div>
            <span className="shrink-0 text-[9px] text-[var(--ed-text-muted)]">{item.dur}</span>
            <button onClick={() => handleAdd(item)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--ed-accent-soft)] text-[var(--ed-accent)] transition hover:bg-[var(--ed-accent)] hover:text-white">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
