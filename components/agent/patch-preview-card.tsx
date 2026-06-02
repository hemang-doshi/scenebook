"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatchOperationTimelineEntry, PatchTimelineEntry } from "@/components/agent/types";
import { cn } from "@/lib/utils";

type PatchPreviewCardProps = {
  entry: PatchTimelineEntry;
  projectId: string;
  onRefresh?: () => void;
};

type ApplyResponse = {
  patchId?: string;
  status?: string;
  operations?: PatchOperationTimelineEntry[];
  error?: string;
};

export function PatchPreviewCard({ entry, projectId, onRefresh }: PatchPreviewCardProps) {
  const [appliedPatch, setAppliedPatch] = useState<PatchTimelineEntry | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = appliedPatch?.patchId === entry.patchId ? appliedPatch : entry;

  const canApply = isPatchApplyEligible(patch, isApplying);
  const needsApproval = patch.status === "awaiting_approval";

  async function applyPatch() {
    if (!canApply) {
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/agent/patches/${patch.patchId}/apply`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as ApplyResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Patch apply failed.");
      }

      setAppliedPatch({
        ...patch,
        status: payload.status ?? "completed",
        operations: mergeOperationResults(patch.operations, payload.operations ?? []),
        canApply: false,
      });
      onRefresh?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Patch apply failed.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Card className="border border-[var(--hairline)] bg-[var(--canvas)] shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Patch</span>
          </div>
          <CardTitle className="text-sm font-bold leading-snug text-[var(--ink)]">{patch.title}</CardTitle>
          {patch.summary ? <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/90">{patch.summary}</p> : null}
        </div>
        <Badge className={statusBadgeClass(patch.status)}>{patch.status}</Badge>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 pt-0 text-sm text-[var(--ink)]">
        <div className="flex flex-wrap gap-2">
          {patch.riskLevel ? (
            <Badge className="border border-[var(--hairline)] bg-[var(--surface-soft)] text-[10px] text-[var(--ink)]/80">
              Risk: {patch.riskLevel}
            </Badge>
          ) : null}
          {patch.requiresApproval ? (
            <Badge className="border border-[var(--hairline)] bg-amber-500/10 text-[10px] text-amber-800">
              Approval
            </Badge>
          ) : null}
        </div>

        {patch.autoApplySkippedReason ? (
          <p className="rounded-[var(--rounded-md)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {patch.autoApplySkippedReason}
          </p>
        ) : null}

        {needsApproval ? (
          <p className="rounded-[var(--rounded-md)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Approval is needed before this patch can be applied. The approval flow is not available yet.
          </p>
        ) : null}

        {patch.operations.length ? (
          <div className="grid gap-2 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/45 p-3">
            {patch.operations.map((operation) => (
              <div
                key={`${operation.operationIndex}-${operation.type}`}
                className="grid gap-1 rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[var(--ink)]">{humanize(operation.type)}</p>
                  {operation.status ? (
                    <Badge className={statusBadgeClass(operation.status)}>{humanize(operation.status)}</Badge>
                  ) : null}
                </div>
                {operation.reason ? <p className="text-xs leading-relaxed text-[var(--muted)]">{operation.reason}</p> : null}
                {operation.message ? <p className="text-xs leading-relaxed text-[var(--ink)]/85">{operation.message}</p> : null}
                {operation.error ? (
                  <p className="text-xs leading-relaxed text-[var(--danger)]">{formatError(operation.error)}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--danger)] font-mono">
            {error}
          </p>
        ) : null}

        {canApply ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => void applyPatch()}
            className="h-9 w-fit gap-2 px-4 text-xs font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Apply to workspace
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function mergeOperationResults(
  current: PatchOperationTimelineEntry[],
  updates: PatchOperationTimelineEntry[],
) {
  if (updates.length === 0) {
    return current;
  }

  const merged = [...current];
  for (const update of updates) {
    const index = merged.findIndex((operation) => operation.operationIndex === update.operationIndex);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...update };
    } else {
      merged.push(update);
    }
  }

  return merged.sort((left, right) => left.operationIndex - right.operationIndex);
}

function isPatchApplyEligible(patch: PatchTimelineEntry, isApplying: boolean) {
  return Boolean(patch.patchId)
    && patch.status === "planned"
    && patch.canApply === true
    && patch.requiresApproval !== true
    && !isApplying;
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  return cn(
    "border border-[var(--hairline)] bg-[var(--surface-soft)] text-[10px] rounded-[var(--rounded-sm)]",
    normalized.includes("fail") || normalized.includes("blocked")
      ? "text-[var(--danger)]"
      : normalized.includes("approval") || normalized.includes("planned") || normalized.includes("applying")
        ? "text-amber-800"
        : "text-[var(--ink)]/80",
  );
}

function formatError(error: PatchOperationTimelineEntry["error"]) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message ?? "";
}

function humanize(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Operation";
}
