"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const categories = ["All", "Reel", "YouTube Shorts", "Product Ad", "Podcast", "Educational"];
const templates = [
  { id: 1, name: "Cinematic Hook", gradient: "linear-gradient(135deg, #667eea, #764ba2)", ratio: "9:16", dur: "0:30" },
  { id: 2, name: "Product Reveal", gradient: "linear-gradient(135deg, #f093fb, #f5576c)", ratio: "9:16", dur: "0:15" },
  { id: 3, name: "Tutorial Intro", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)", ratio: "16:9", dur: "0:45" },
  { id: 4, name: "Story Montage", gradient: "linear-gradient(135deg, #43e97b, #38f9d7)", ratio: "9:16", dur: "0:20" },
  { id: 5, name: "Podcast Clip", gradient: "linear-gradient(135deg, #fa709a, #fee140)", ratio: "1:1", dur: "1:00" },
  { id: 6, name: "Meme Format", gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)", ratio: "9:16", dur: "0:10" },
];

export default function TemplatesPanel() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("All");
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ed-text-muted)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="h-8 w-full rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] pl-7 pr-2 text-xs" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto ed-scrollbar pb-1">
        {categories.map((c) => (
          <button key={c} onClick={() => setActive(c)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${active === c ? "bg-[var(--ed-accent)] text-white" : "bg-[var(--ed-surface-muted)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-secondary)]"}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {templates.map((t) => (
          <button key={t.id} className="group relative overflow-hidden rounded-[var(--ed-radius-md)] border border-[var(--ed-border-subtle)] transition hover:border-[var(--ed-accent)]/40">
            <div className="aspect-[9/14] w-full" style={{ background: t.gradient }} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">Use Template</div>
            <div className="absolute bottom-1 left-1 flex gap-1">
              <span className="rounded bg-black/50 px-1 py-0.5 text-[8px] text-white/70">{t.ratio}</span>
              <span className="rounded bg-black/50 px-1 py-0.5 text-[8px] text-white/70">{t.dur}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
