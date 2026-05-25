"use client";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";

const mockMedia = [
  { id: "m1", title: "Intro Hook.mp4", type: "video" as const, gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
  { id: "m2", title: "Product Shot.png", type: "image" as const, gradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { id: "m3", title: "B-Roll City.mp4", type: "video" as const, gradient: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  { id: "m4", title: "Desk Setup.jpg", type: "image" as const, gradient: "linear-gradient(135deg, #43e97b, #38f9d7)" },
];

export default function MediaPanel() {
  const [search, setSearch] = useState("");
  const addClip = useEditorStore((s) => s.addClip);
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);
  const tracks = useEditorStore((s) => s.tracks);

  const handleAdd = (item: typeof mockMedia[0]) => {
    const videoTrack = tracks.find((t) => t.type === "video");
    if (videoTrack) addClip(videoTrack.id, item.type, item.title, item.type === "video" ? 8 : 5);
    addCanvasObject(item.type, item.title);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ed-text-muted)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search media..." className="h-8 w-full rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] pl-7 pr-2 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {mockMedia.map((item) => (
          <div key={item.id} className="group overflow-hidden rounded-[var(--ed-radius-md)] border border-[var(--ed-border-subtle)]">
            <div className="aspect-video w-full" style={{ background: item.gradient }} />
            <div className="p-1.5">
              <p className="truncate text-[10px] font-medium">{item.title}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="rounded bg-[var(--ed-surface-muted)] px-1 py-0.5 text-[8px] uppercase text-[var(--ed-text-muted)]">{item.type}</span>
                <button onClick={() => handleAdd(item)} className="flex h-5 items-center gap-0.5 rounded bg-[var(--ed-accent-soft)] px-1.5 text-[9px] font-medium text-[var(--ed-accent)] transition hover:bg-[var(--ed-accent)] hover:text-white">
                  <Plus className="h-2.5 w-2.5" /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
