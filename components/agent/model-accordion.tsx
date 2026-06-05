"use client";

import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getModelById, getModelsForAccordion } from "@/lib/ai/model-registry";
import { cn } from "@/lib/utils";

export type AgentModelSelection = {
  chat: string;
  image: string;
  video: string;
  audio: string;
};

const groups = getModelsForAccordion();

export function ModelAccordion({
  models,
  onChange,
}: {
  models: AgentModelSelection;
  onChange: (next: AgentModelSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<keyof AgentModelSelection>("chat");

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="h-9 min-h-9 w-9 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.052)] px-0 py-0 text-[var(--ink)]/80 hover:border-[var(--line-strong)] focus-visible:ring-0"
        aria-label="Model routing"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal className="h-4 w-4 text-[var(--ink)]/70" />
      </Button>
      {open ? (
        <div className="absolute bottom-[calc(100%+0.6rem)] right-0 z-40 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(20,24,33,.96)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-[18px] animate-[ed-fadeIn_0.15s_ease-out]">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.07em] text-[var(--ink)]/75">
              Models
            </p>
          </div>
          <div className="mb-2 grid grid-cols-4 gap-1">
            {(Object.keys(groups) as Array<keyof AgentModelSelection>).map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "h-7 rounded-[var(--radius-sm)] border px-1 text-[9px] font-mono uppercase tracking-[.06em] transition-colors focus-visible:outline-none focus-visible:ring-0",
                  openSection === key
                    ? "border-[var(--coral)]/45 bg-[var(--coral)]/12 text-[var(--coral-2)]"
                    : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--ink)]",
                )}
                onClick={() => setOpenSection(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="grid max-h-60 gap-1 overflow-y-auto pr-1 scrollbar-thin">
            {groups[openSection].map((model) => {
              const active = models[openSection] === model.id;
              return (
                <Button
                  key={model.id}
                  variant="ghost"
                  className={cn(
                    "h-auto min-h-0 w-full justify-between rounded-[var(--radius-sm)] px-2 py-2 text-left normal-case tracking-[0] hover:bg-[rgba(255,255,255,.055)] focus-visible:ring-0",
                    active && "border-[var(--line)] bg-[rgba(255,255,255,.055)]",
                  )}
                  onClick={() => onChange({ ...models, [openSection]: model.id })}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[var(--ink)]">
                      {model.label}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[.05em] text-[var(--muted)]">
                      {model.provider}
                    </span>
                  </span>
                  {active ? <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-[var(--coral-2)]" /> : null}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 truncate px-1 font-mono text-[9px] uppercase tracking-[.05em] text-[var(--muted-2)]">
            {getModelById(models[openSection])?.label ?? "Default model"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
