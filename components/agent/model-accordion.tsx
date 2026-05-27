"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getModelsForAccordion } from "@/lib/ai/model-registry";

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

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className="h-8 rounded-full border border-border/70 bg-black/20 px-3 text-[10px] text-muted hover:border-border hover:bg-white/5 hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
        Routing
        <ChevronDown className="ml-2 h-3.5 w-3.5" />
      </Button>
      {open ? (
        <Card className="absolute bottom-[calc(100%+0.75rem)] right-0 z-20 w-[20rem] border-border/80 bg-background/95 shadow-2xl shadow-black/30">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm">Model routing</CardTitle>
            <p className="text-xs text-muted">Choose defaults per modality.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {Object.entries(groups).map(([key, presets]) => (
              <label key={key} className="grid gap-1 text-xs text-muted">
                <span className="font-mono uppercase tracking-[0.08em] text-foreground">{key}</span>
                <Select
                  aria-label={`${key} model`}
                  className="h-9 rounded-xl"
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
              </label>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
