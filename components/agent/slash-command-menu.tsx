"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const commandCatalog = [
  { command: "/script", label: "Script", description: "Turn a rough idea into hook, script, caption, and CTA." },
  { command: "/plan", label: "Plan", description: "Shape a production plan, beats, shots, and next action." },
  { command: "/readiness-check", label: "Readiness", description: "Ask the agent to analyze blockers, confidence, and next action." },
  { command: "/form-json-prompt", label: "Prompt JSON", description: "Build a detailed generation-ready prompt package." },
  { command: "/package", label: "Package", description: "Create a complete script, shoot, asset, and publish package." },
  { command: "/generate", label: "Generate", description: "Create image, video, or audio from text or JSON." },
  { command: "/generate-image", label: "Image", description: "Generate an image concept." },
  { command: "/generate-video", label: "Video", description: "Generate a video concept." },
  { command: "/generate-audio", label: "Audio", description: "Generate voice or sound." },
  { command: "/storyboard", label: "Storyboard", description: "Map the idea into shots and beats." },
  { command: "/tasks", label: "Tasks", description: "Plan or update production tasks." },
  { command: "/instagram", label: "Instagram", description: "Prep captions, packaging, and posting." },
  { command: "/analyze", label: "Analyze", description: "Review analytics and next iterations." },
  { command: "/import-to-editor", label: "Editor", description: "Prepare a handoff into the editor." },
  { command: "/export", label: "Export", description: "Plan final export settings and delivery checks." },
];

export type VisibleSlashCommand = (typeof commandCatalog)[number];

export function getVisibleCommands(input: string) {
  const trimmed = input.trimStart();

  if (!trimmed.startsWith("/")) {
    return [];
  }

  return commandCatalog.filter((item) => item.command.includes(trimmed));
}

export function SlashCommandMenu({
  input,
  onSelect,
}: {
  input: string;
  onSelect: (command: string) => void;
}) {
  const commands = getVisibleCommands(input);

  if (commands.length === 0) {
    return null;
  }

  return (
    <Card className="absolute bottom-[calc(100%+0.6rem)] left-0 z-40 w-[min(16rem,calc(100vw-1.5rem))] rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(20,24,33,.96)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-[18px] animate-[ed-fadeIn_0.15s_ease-out]">
      <div className="grid max-h-72 gap-0.5 overflow-y-auto pr-1 scrollbar-thin">
        {commands.map((item) => (
          <Button
            key={item.command}
            type="button"
            variant="ghost"
            className="h-8 min-h-8 w-full justify-start rounded-[var(--radius-sm)] px-2 text-left normal-case tracking-[0] hover:bg-[rgba(255,255,255,.055)] focus-visible:ring-0"
            onClick={() => onSelect(item.command)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-16 shrink-0 truncate font-mono text-[10px] font-semibold text-[var(--ink)]">
                {item.label}
              </span>
              <span className="truncate text-[11px] leading-none text-[var(--muted)]">
                {item.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
