"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { ModelAccordion, type AgentModelSelection } from "@/components/agent/model-accordion";
import { SlashCommandMenu } from "@/components/agent/slash-command-menu";
import { ShinyButton } from "@/components/ui/shiny-button";

export function AgentComposer({
  value,
  onChange,
  onSubmit,
  isSending,
  models,
  onModelsChange,
  onQuickCommand,
  editorHref,
  large = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  models: AgentModelSelection;
  onModelsChange: (next: AgentModelSelection) => void;
  onQuickCommand: (command: string) => void;
  editorHref?: string;
  large?: boolean;
}) {
  return (
    <Card className="border-border/80 bg-[rgba(20,20,20,0.92)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.28)]">
      <div className="grid gap-2">
        <div className="relative">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Ask the agent for the next beat, prompt bundle, storyboard, or a sharper cut."
            className={[
              "max-h-64 resize-none rounded-[1.75rem] border-0 bg-transparent px-4 py-3 text-[15px] leading-6 shadow-none focus-visible:ring-0",
              large ? "min-h-[7.5rem]" : "min-h-[5.5rem]",
            ].join(" ")}
          />
          <SlashCommandMenu input={value} onSelect={onQuickCommand} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-border/60 bg-black/20 px-3 py-2">
          <div className="flex items-center gap-2">
            {editorHref ? (
              <Link href={editorHref}>
                <ShinyButton className="h-7 px-2.5 text-[9px] uppercase tracking-wider font-mono">
                  Open editor
                </ShinyButton>
              </Link>
            ) : null}
            <ModelAccordion models={models} onChange={onModelsChange} />
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-[11px] text-muted md:block">Use `/` commands or send freeform prompts. Submit with Cmd/Ctrl+Enter.</p>
            <Button
              aria-label="Send message"
              disabled={isSending || !value.trim()}
              onClick={onSubmit}
              className="h-10 w-10 rounded-full px-0"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
