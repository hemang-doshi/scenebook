"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const commandCatalog = [
  { command: "/script", label: "Script", description: "Turn a rough idea into hook, script, caption, and CTA." },
  { command: "/form-json-prompt", label: "Prompt JSON", description: "Build a detailed generation-ready prompt package." },
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
    <Card className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-full max-w-[26rem] border border-[var(--hairline)] bg-[var(--canvas)] p-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-[var(--rounded-lg)]">
      <div className="grid gap-1">
        {commands.map((item) => (
          <Button
            key={item.command}
            type="button"
            variant="ghost"
            className="h-auto w-full rounded-[var(--rounded-md)] px-2.5 py-2.5 text-left normal-case tracking-normal hover:bg-[var(--surface-soft)]"
            onClick={() => onSelect(item.command)}
          >
            <span className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ink)] font-bold">
                {item.label}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-[var(--ink)] font-bold">
                  {item.command}
                </span>
                <span className="block text-xs text-[var(--muted)] leading-relaxed mt-0.5">
                  {item.description}
                </span>
              </span>
            </span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
