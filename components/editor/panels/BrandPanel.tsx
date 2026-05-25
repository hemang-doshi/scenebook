"use client";
import { Upload } from "lucide-react";

const brandColors = ["#6968ff", "#FF6B6B", "#4ECDC4", "#FFE66D", "#2C3E50"];
const brandFonts = [
  { name: "Inter", preview: "The quick brown fox" },
  { name: "JetBrains Mono", preview: "const editor = new()" },
];

export default function BrandPanel() {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Brand Colors</p>
        <div className="flex gap-2">
          {brandColors.map((c) => (
            <button key={c} className="h-8 w-8 rounded-full border-2 border-transparent transition hover:border-white/30" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Brand Fonts</p>
        <div className="space-y-2">
          {brandFonts.map((f) => (
            <div key={f.name} className="rounded-[var(--ed-radius-sm)] bg-[var(--ed-surface-muted)] p-2.5">
              <p className="text-[10px] font-medium text-[var(--ed-text-muted)]">{f.name}</p>
              <p className="mt-0.5 text-sm">{f.preview}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Logos</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((i) => (
            <button key={i} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--ed-radius-md)] border-2 border-dashed border-[var(--ed-border)] text-[var(--ed-text-muted)] transition hover:border-[var(--ed-accent)] hover:text-[var(--ed-accent)]">
              <Upload className="h-4 w-4" /><span className="text-[9px]">Upload</span>
            </button>
          ))}
        </div>
      </div>
      <button className="w-full rounded-[var(--ed-radius-sm)] border border-[var(--ed-border)] py-2 text-xs text-[var(--ed-text-muted)] transition hover:bg-[var(--ed-surface-muted)]">Manage Brand Kit</button>
    </div>
  );
}
