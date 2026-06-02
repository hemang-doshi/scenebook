import type { AgentTimelineEntry, PatchOperationTimelineEntry } from "@/components/agent/types";

function sortEntries(entries: AgentTimelineEntry[]) {
  return [...entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function mergePatchOperations(
  current: PatchOperationTimelineEntry[],
  incoming: PatchOperationTimelineEntry[],
) {
  if (incoming.length === 0) {
    return current;
  }

  const merged = [...current];
  for (const operation of incoming) {
    const index = merged.findIndex((candidate) => candidate.operationIndex === operation.operationIndex);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...operation };
    } else {
      merged.push(operation);
    }
  }
  return merged.sort((left, right) => left.operationIndex - right.operationIndex);
}

export function mergeTimelineEntry(current: AgentTimelineEntry, incoming: AgentTimelineEntry): AgentTimelineEntry {
  if (current.kind === "patch" && incoming.kind === "patch") {
    return {
      ...current,
      ...incoming,
      summary: incoming.summary ?? current.summary,
      riskLevel: incoming.riskLevel ?? current.riskLevel,
      autoApplySkippedReason: incoming.autoApplySkippedReason ?? current.autoApplySkippedReason,
      operations: mergePatchOperations(current.operations, incoming.operations),
      metadata: { ...(current.metadata ?? {}), ...(incoming.metadata ?? {}) },
    };
  }

  if (current.kind === "workflow" && incoming.kind === "workflow") {
    return {
      ...current,
      ...incoming,
      artifacts: incoming.artifacts?.length ? incoming.artifacts : current.artifacts,
      patch: incoming.patch ?? current.patch,
      nextAction: incoming.nextAction ?? current.nextAction,
      metadata: { ...(current.metadata ?? {}), ...(incoming.metadata ?? {}) },
    };
  }

  return incoming;
}

function sameTimelineEntry(left: AgentTimelineEntry, right: AgentTimelineEntry) {
  if (left.kind === "patch" && right.kind === "patch") {
    return left.patchId === right.patchId;
  }
  return left.id === right.id;
}

function nestedArtifactIds(entry: AgentTimelineEntry) {
  if (entry.kind !== "workflow") {
    return [];
  }

  return (entry.artifacts ?? []).map((artifact) => artifact.id);
}

function isNestedArtifact(entry: AgentTimelineEntry, entries: AgentTimelineEntry[]) {
  if (entry.kind !== "artifact") {
    return false;
  }

  return entries.some((candidate) => nestedArtifactIds(candidate).includes(entry.id));
}

export function upsertTimelineEntries(
  current: AgentTimelineEntry[],
  incoming: AgentTimelineEntry[],
) {
  const next = [...current];
  for (const entry of incoming) {
    if (isNestedArtifact(entry, next)) {
      continue;
    }

    const nestedIds = nestedArtifactIds(entry);
    if (nestedIds.length > 0) {
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].kind === "artifact" && nestedIds.includes(next[index].id)) {
          next.splice(index, 1);
        }
      }
    }

    const index = next.findIndex((candidate) => sameTimelineEntry(candidate, entry));
    if (index >= 0) {
      next[index] = mergeTimelineEntry(next[index], entry);
    } else {
      next.push(entry);
    }
  }
  return sortEntries(next);
}
