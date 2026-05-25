"use client";
import { Sparkles, MessageSquare, Wand2, Film, Layers, FileText, ArrowRight } from "lucide-react";

const tools = [
  { icon: Sparkles, title: "Generate Reel Structure", desc: "AI creates a complete reel outline from your script", color: "#6968ff" },
  { icon: MessageSquare, title: "Auto Captions", desc: "Generate and sync captions to your video", color: "#4ECDC4" },
  { icon: Wand2, title: "Rewrite Hook", desc: "Get AI variations of your opening hook", color: "#FF6B6B" },
  { icon: Film, title: "Suggest B-Roll", desc: "AI suggests B-roll clips for your edit points", color: "#FFE66D" },
  { icon: Layers, title: "Generate Scene Variants", desc: "Create alternative versions of your scenes", color: "#A78BFA" },
  { icon: FileText, title: "Turn Notes into Video", desc: "Transform your script notes into a storyboard", color: "#34D399" },
];

export default function AiToolsPanel() {
  return (
    <div className="space-y-2">
      {tools.map((tool) => (
        <button key={tool.title} className="flex w-full items-start gap-3 rounded-[var(--ed-radius-md)] bg-[var(--ed-surface-muted)] p-3 text-left transition hover:bg-[var(--ed-surface-raised)]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ed-radius-sm)]" style={{ background: `${tool.color}15` }}>
            <tool.icon className="h-4 w-4" style={{ color: tool.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium">{tool.title}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--ed-text-muted)]">{tool.desc}</p>
          </div>
          <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-[var(--ed-accent)]" />
        </button>
      ))}
    </div>
  );
}
