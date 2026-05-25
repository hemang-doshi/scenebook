"use client";
import { Upload, FileVideo, FileImage, FileAudio } from "lucide-react";

const recentFiles = [
  { name: "intro-clip.mp4", size: "12.4 MB", icon: FileVideo },
  { name: "product-shot.png", size: "2.1 MB", icon: FileImage },
  { name: "voiceover.mp3", size: "4.8 MB", icon: FileAudio },
];

export default function UploadsPanel() {
  return (
    <div className="space-y-4">
      <button className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ed-radius-md)] border-2 border-dashed border-[var(--ed-border)] bg-[var(--ed-surface-muted)] py-8 text-[var(--ed-text-muted)] transition hover:border-[var(--ed-accent)] hover:text-[var(--ed-accent)]">
        <Upload className="h-6 w-6" />
        <span className="text-xs font-medium">Drag files here or click to upload</span>
        <span className="text-[10px]">MP4, MOV, MP3, PNG, JPG</span>
      </button>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Recent Uploads</p>
        <div className="space-y-1.5">
          {recentFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-2.5 rounded-[var(--ed-radius-sm)] bg-[var(--ed-surface-muted)] px-2.5 py-2">
              <f.icon className="h-4 w-4 shrink-0 text-[var(--ed-text-muted)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{f.name}</p>
                <p className="text-[9px] text-[var(--ed-text-muted)]">{f.size}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
