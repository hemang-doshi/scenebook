"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolCallCard } from "@/components/agent/tool-call-card";
import type { AgentUiToolCall } from "@/components/agent/agent-chat-island";

interface ApprovalCardProps {
  toolCall: AgentUiToolCall;
  projectId: string;
  onRefresh: () => void;
}

export function ApprovalCard({ toolCall, projectId, onRefresh }: ApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAskingChanges, setIsAskingChanges] = useState(false);
  const [editText, setEditText] = useState(() => JSON.stringify(toolCall.output, null, 2));
  const [changesText, setChangesText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = toolCall.status === "awaiting_approval";

  async function handleApprove() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolCallId: toolCall.id,
          action: "apply",
        }),
      });
      if (!res.ok) throw new Error("Apply failed");
      onRefresh();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to apply tool call.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolCallId: toolCall.id,
          status: "rejected",
        }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      onRefresh();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to reject tool call.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    try {
      const parsed = JSON.parse(editText);
      setValidationError(null);
      setIsSubmitting(true);

      const res = await fetch(`/api/projects/${projectId}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolCallId: toolCall.id,
          status: "awaiting_approval",
          output: parsed,
        }),
      });
      if (!res.ok) throw new Error("Update failed");

      setIsEditing(false);
      onRefresh();
    } catch (err) {
      setValidationError(err instanceof Error ? "Invalid JSON: " + err.message : "Failed to update tool call.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAskForChanges() {
    setIsSubmitting(true);
    try {
      const baseOutput =
        typeof toolCall.output === "object" && toolCall.output !== null && !Array.isArray(toolCall.output)
          ? toolCall.output as Record<string, unknown>
          : {};
      const res = await fetch(`/api/projects/${projectId}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolCallId: toolCall.id,
          status: "awaiting_input",
          output: {
            ...baseOutput,
            requestedChanges: changesText.trim(),
          },
        }),
      });
      if (!res.ok) throw new Error("Change request failed");
      setIsAskingChanges(false);
      onRefresh();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to request changes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="grid gap-4 rounded-[var(--rounded-lg)] border border-[var(--hairline)] bg-[var(--canvas)] p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)]">Edit Tool Output</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Modify the structured output JSON before approval.</p>
        </div>

        {validationError ? (
          <p className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--danger)] font-mono">
            {validationError}
          </p>
        ) : null}

        <Textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="min-h-[20rem] font-mono text-xs leading-relaxed bg-[var(--canvas)] border border-[var(--hairline)] p-4 rounded-[var(--rounded-md)] text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--ink)]/10 focus-visible:border-[var(--ink)]"
        />

        <div className="flex gap-2 pt-2 border-t border-[var(--hairline)]">
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSaveEdit}
            className="h-9 px-4 text-xs font-semibold"
          >
            Save Changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => {
              setEditText(JSON.stringify(toolCall.output, null, 2));
              setValidationError(null);
              setIsEditing(false);
            }}
            className="h-9 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (isAskingChanges) {
    return (
      <div className="grid gap-4 rounded-[var(--rounded-lg)] border border-[var(--hairline)] bg-[var(--canvas)] p-6 shadow-sm">
        <ToolCallCard toolCall={toolCall} />

        {validationError ? (
          <p className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--danger)] font-mono">
            {validationError}
          </p>
        ) : null}

        <Textarea
          value={changesText}
          onChange={(e) => setChangesText(e.target.value)}
          placeholder="What should change before this runs?"
          className="min-h-[8rem] bg-[var(--canvas)] border border-[var(--hairline)] p-4 rounded-[var(--rounded-md)] text-sm text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--ink)]/10 focus-visible:border-[var(--ink)]"
        />

        <div className="flex gap-2 pt-2 border-t border-[var(--hairline)]">
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting || !changesText.trim()}
            onClick={handleAskForChanges}
            className="h-9 px-4 text-xs font-semibold"
          >
            Ask for changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => {
              setChangesText("");
              setValidationError(null);
              setIsAskingChanges(false);
            }}
            className="h-9 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-5 shadow-sm">
      <ToolCallCard toolCall={toolCall} />

      {validationError ? (
        <p className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--danger)] font-mono">
          {validationError}
        </p>
      ) : null}

      {isPending ? (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--hairline)]">
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleApprove}
            className="h-9 px-4 text-xs font-semibold"
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => setIsAskingChanges(true)}
            className="h-9 px-4 text-xs font-semibold border-[var(--hairline)]"
          >
            Ask for changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => setIsEditing(true)}
            className="h-9 px-4 text-xs font-semibold border-[var(--hairline)]"
          >
            Edit JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={handleReject}
            className="h-9 px-4 text-xs font-semibold"
          >
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}
