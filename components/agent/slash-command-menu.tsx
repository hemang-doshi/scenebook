"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const commandCatalog = [
  { command: "/script", description: "Draft a scripted beat package." },
  { command: "/form-json-prompt", description: "Turn an idea into structured JSON." },
  { command: "/generate", description: "Build a generation-ready prompt bundle." },
  { command: "/storyboard", description: "Outline a visual shot sequence." },
  { command: "/tasks", description: "List production tasks for this project." },
  { command: "/instagram", description: "Show the Instagram stub actions." },
];

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
    <Card className="absolute bottom-[calc(100%+0.75rem)] left-0 z-20 w-full max-w-sm border-border/80 bg-background/95 p-1.5 shadow-2xl shadow-black/30">
      <div className="grid gap-1">
        {commands.map((item) => (
          <Button
            key={item.command}
            type="button"
            variant="ghost"
            className="h-auto items-start justify-between rounded-xl px-2.5 py-2 text-left normal-case tracking-normal"
            onClick={() => onSelect(item.command)}
          >
            <span className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-foreground">
                {item.command}
              </span>
              <span className="text-[11px] text-muted">{item.description}</span>
            </span>
            <Badge className="border-border/70 bg-black/20 px-2 py-0.5 text-[9px] text-muted">
              slash
            </Badge>
          </Button>
        ))}
      </div>
    </Card>
  );
}
