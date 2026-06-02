"use client";

import { GitBranch, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowTimelineEntry } from "@/components/agent/types";
import { cn } from "@/lib/utils";

type WorkflowCardProps = {
  entry: WorkflowTimelineEntry;
};

export function WorkflowCard({ entry }: WorkflowCardProps) {
  const patch = entry.patch;
  const patchState = patch?.applied ? "applied" : patch?.planned ? "planned" : patch?.status;

  return (
    <Card className="border border-[var(--hairline)] bg-[var(--canvas)] shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55">
            <GitBranch className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Workflow</span>
          </div>
          <CardTitle className="text-sm font-bold leading-snug text-[var(--ink)]">
            {entry.displayName || humanize(entry.workflowName)}
          </CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/90">{entry.summary}</p>
        </div>
        <Badge className={statusBadgeClass(entry.status)}>{entry.status}</Badge>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 pt-0 text-sm text-[var(--ink)]">
        {entry.artifacts?.length ? (
          <div className="grid gap-2 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/45 p-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/60">
              <Layers3 className="h-3.5 w-3.5" />
              <span>Artifacts</span>
            </div>
            <div className="grid gap-2">
              {entry.artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="flex items-start justify-between gap-3 rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--ink)]">{artifact.title}</p>
                    {artifact.summary ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{artifact.summary}</p>
                    ) : null}
                  </div>
                  {humanize(artifact.artifactType).toLowerCase() !== artifact.title.toLowerCase() ? (
                    <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider text-[var(--ink)]/45">
                      {humanize(artifact.artifactType)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {patch ? (
          <div className="grid gap-1 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[var(--ink)]">{patch.title || "Project patch"}</p>
              {patchState ? <Badge className={statusBadgeClass(patchState)}>{patchState}</Badge> : null}
            </div>
            {patch.summary ? <p className="text-xs leading-relaxed text-[var(--muted)]">{patch.summary}</p> : null}
            {patch.autoApplySkippedReason ? (
              <p className="text-xs leading-relaxed text-amber-800">{patch.autoApplySkippedReason}</p>
            ) : null}
          </div>
        ) : null}

        {entry.nextAction ? (
          <div className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/50">Next action</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink)]">{entry.nextAction}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function humanize(value: string) {
  const words = value.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Workflow";
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  return cn(
    "border border-[var(--hairline)] bg-[var(--surface-soft)] text-[10px] rounded-[var(--rounded-sm)]",
    normalized.includes("fail") || normalized.includes("blocked")
      ? "text-[var(--danger)]"
      : normalized.includes("input") || normalized.includes("approval") || normalized.includes("planned")
        ? "text-amber-800"
        : "text-[var(--ink)]/80",
  );
}
