"use client";

import { useState } from "react";
import { CheckCircle2, Code2, GitBranch, Pencil, XCircle } from "lucide-react";

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
  const [isInspectingJson, setIsInspectingJson] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"active" | "branched" | "rejected">("active");
  const patch = appliedPatch?.patchId === entry.patchId ? appliedPatch : entry;

  const canApply = reviewStatus === "active" && isPatchApplyEligible(patch, isApplying);
  const needsApproval = patch.status === "awaiting_approval";
  const affectedObjects = Array.from(new Set(patch.operations.map((operation) => objectNameForOperation(operation.type))));

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
    <Card className="sb-review-surface border-[rgba(17,19,24,.12)] bg-[var(--white)] text-[var(--light-ink)] shadow-[var(--shadow-soft)]">
      <CardHeader className="flex-row items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-[var(--light-muted)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--coral)]" />
            <span>Patch review</span>
          </div>
          <CardTitle className="text-base font-bold leading-snug text-[var(--light-ink)]">{patch.title}</CardTitle>
          {patch.summary ? <p className="mt-2 text-sm leading-relaxed text-[var(--light-muted)]">{patch.summary}</p> : null}
        </div>
        <Badge className={statusBadgeClass(patch.status)}>{patch.status}</Badge>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 pt-0 text-sm text-[var(--light-ink)]">
        <div className="grid gap-2 rounded-[var(--radius-md)] border border-[rgba(17,19,24,.12)] bg-[var(--bone)] p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--light-muted)]">Affected object tree</p>
          {affectedObjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {affectedObjects.map((objectName) => (
                <Badge
                  key={objectName}
                  className="border-[rgba(17,19,24,.14)] bg-[var(--white)] text-[var(--light-ink)]"
                >
                  {objectName}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--light-muted)]">No operation details were included with this patch.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {patch.riskLevel ? (
            <Badge className="border-[rgba(17,19,24,.14)] bg-[var(--bone)] text-[var(--light-ink)]">
              Risk: {patch.riskLevel}
            </Badge>
          ) : null}
          {patch.requiresApproval ? (
            <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-900">
              Approval
            </Badge>
          ) : null}
          {reviewStatus === "branched" ? (
            <Badge className="border-[var(--blue)]/40 bg-[var(--blue)]/15 text-[#16436f]">branched</Badge>
          ) : null}
          {reviewStatus === "rejected" ? (
            <Badge className="border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[#8a2638]">rejected</Badge>
          ) : null}
        </div>

        {patch.autoApplySkippedReason ? (
          <p className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {patch.autoApplySkippedReason}
          </p>
        ) : null}

        {needsApproval ? (
          <p className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Approval is needed before this patch can be applied. The approval flow is not available yet.
          </p>
        ) : null}

        {patch.operations.length ? (
          <div className="grid gap-2 rounded-[var(--radius-md)] border border-[rgba(17,19,24,.12)] bg-[var(--bone)] p-3">
            {patch.operations.map((operation) => (
              <div
                key={`${operation.operationIndex}-${operation.type}`}
                className="grid gap-1 rounded-[var(--radius-sm)] border border-[rgba(17,19,24,.10)] bg-[var(--white)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[var(--light-ink)]">{humanize(operation.type)}</p>
                  {operation.status ? (
                    <Badge className={statusBadgeClass(operation.status)}>{humanize(operation.status)}</Badge>
                  ) : null}
                </div>
                {operation.reason ? <p className="text-xs leading-relaxed text-[var(--light-muted)]">{operation.reason}</p> : null}
                {operation.message ? <p className="text-xs leading-relaxed text-[var(--light-ink)]/85">{operation.message}</p> : null}
                {operation.error ? (
                  <p className="text-xs leading-relaxed text-[var(--danger)]">{formatError(operation.error)}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[var(--radius-md)] border border-[rgba(17,19,24,.12)] bg-[var(--bone)] px-3 py-2 text-xs text-[var(--danger)] font-mono">
            {error}
          </p>
        ) : null}

        {isEditing ? (
          <div className="grid gap-2 rounded-[var(--radius-md)] border border-[rgba(17,19,24,.12)] bg-[var(--bone)] p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--light-muted)]">Edit first</p>
            <p className="text-xs leading-relaxed text-[var(--light-muted)]">
              Ask the agent for a revised patch in this thread before applying. The persisted patch is unchanged until a new plan is generated.
            </p>
          </div>
        ) : null}

        {isInspectingJson ? (
          <pre className="sb-motion-receipt-expand max-h-96 overflow-auto rounded-[var(--radius-md)] border border-[rgba(17,19,24,.12)] bg-[#111318] p-4 text-xs leading-relaxed text-[var(--white)]">
            {JSON.stringify(patch, null, 2)}
          </pre>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          {canApply ? (
            <Button
              type="button"
              variant="coral"
              onClick={() => void applyPatch()}
              className="h-9 w-fit gap-2 px-4 text-xs font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Apply to workspace
            </Button>
          ) : null}
          <Button
            type="button"
            variant="dark"
            onClick={() => setIsEditing((current) => !current)}
            className="h-9 w-fit gap-2 px-4 text-xs font-semibold"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit first
          </Button>
          <Button
            type="button"
            variant="dark"
            onClick={() => setReviewStatus("branched")}
            className="h-9 w-fit gap-2 px-4 text-xs font-semibold"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Branch version
          </Button>
          <Button
            type="button"
            variant="ghostLight"
            onClick={() => setReviewStatus("rejected")}
            className="h-9 w-fit gap-2 px-4 text-xs font-semibold"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            type="button"
            variant="ghostLight"
            onClick={() => setIsInspectingJson((current) => !current)}
            className="h-9 w-fit gap-2 px-4 text-xs font-semibold"
          >
            <Code2 className="h-3.5 w-3.5" />
            Inspect JSON
          </Button>
        </div>
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
    "border border-[rgba(17,19,24,.14)] bg-[var(--bone)] text-[10px] rounded-[var(--radius-pill)]",
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

function objectNameForOperation(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const actionVerbs = new Set(["add", "apply", "create", "delete", "record", "remove", "replace", "save", "store", "update"]);
  const objectWords = words.filter((word, index) => index > 0 || !actionVerbs.has(word.toLowerCase()));
  const label = objectWords.length > 0 ? objectWords.join(" ") : words.join(" ");
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Workspace object";
}
