"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getModelById, getModelsForAccordion } from "@/lib/ai/model-registry";

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
  const [openSection, setOpenSection] = useState<keyof AgentModelSelection | null>(null);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="h-8 rounded-full border border-[var(--hairline)] bg-[var(--canvas)] px-3 text-[10px] text-[var(--ink)]/80 hover:border-[var(--ink)] uppercase tracking-wider font-mono transition-all duration-200"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal className="mr-1.5 h-3 w-3 text-[var(--ink)]/70" />
        Routing
        <ChevronDown className="ml-1.5 h-3 w-3 text-[var(--ink)]/70" />
      </Button>
      {open ? (
        <Card className="absolute bottom-[calc(100%+0.75rem)] right-0 z-20 w-[19rem] border border-[var(--hairline)] bg-[var(--canvas)] shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-[var(--rounded-lg)]">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-[var(--ink)]">Model routing</CardTitle>
            <p className="text-xs text-[var(--muted)]">Choose defaults per modality.</p>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 pb-4">
            {Object.entries(groups).map(([key, presets]) => (
              <div key={key} className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/30">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-[var(--rounded-md)] px-3 py-2.5 text-left normal-case tracking-normal hover:bg-[var(--surface-soft)]"
                  aria-expanded={openSection === key}
                  onClick={() =>
                    setOpenSection((current) =>
                      current === key ? null : (key as keyof AgentModelSelection),
                    )
                  }
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--ink)]/60">
                      {key}
                    </span>
                    <span className="block truncate text-xs font-semibold text-[var(--ink)] mt-0.5">
                      {getModelById(models[key as keyof AgentModelSelection])?.label ?? "Select a model"}
                    </span>
                  </span>
                  <ChevronDown
                    className={[
                      "ml-2 h-3.5 w-3.5 shrink-0 text-[var(--ink)]/50 transition-transform duration-200",
                      openSection === key ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </Button>
                {openSection === key ? (
                  <div className="px-3 pb-3">
                    <Select
                      aria-label={`${key} model`}
                      className="h-9 rounded-[var(--rounded-md)] text-xs bg-[var(--canvas)] border border-[var(--hairline)] text-[var(--ink)] w-full p-1.5 focus:ring-2 focus:ring-[var(--ink)]/10"
                      value={models[key as keyof AgentModelSelection]}
                      onChange={(event) =>
                        onChange({
                          ...models,
                          [key]: event.target.value,
                        })
                      }
                    >
                      {presets.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
