"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AgentUiToolCall } from "@/components/agent/agent-chat-island";

function prettyPrint(value: unknown) {
  return JSON.stringify(value, null, 2);
}

type ToolCallCardProps = {
  toolCall: AgentUiToolCall;
  onQuickCommand?: (command: string) => void;
};

export function ToolCallCard({ toolCall, onQuickCommand }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const output = (toolCall.output ?? {}) as Record<string, unknown>;
  const kind = typeof output.kind === "string" ? output.kind : null;
  const modality = typeof output.modality === "string" ? output.modality : "image";

  async function copyOutput(value: unknown) {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Card className="border border-[var(--hairline)] bg-[var(--canvas)] shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-sm font-bold text-[var(--ink)]">{toolCall.toolName}</CardTitle>
          <p className="mt-1 text-xs text-[var(--muted)] font-mono">
            {toolCall.command ? `/${toolCall.command}` : "tool"} • {toolCall.status}
          </p>
          <p className="mt-2 text-sm text-[var(--ink)] font-sans">{summarizeToolCall(toolCall, output)}</p>
        </div>
        <Badge className={badgeClass(toolCall.status)}>
          {toolCall.status === "approved" ? "applied" : kind ?? "tool"}
        </Badge>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm text-[var(--ink)]">
        {toolCall.errorMessage ? (
          <p className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--danger)] font-mono">
            {toolCall.errorMessage}
          </p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="h-8 w-fit px-4 text-[10px] border-[var(--hairline)]"
        >
          {expanded ? "Hide details" : "Show details"}
        </Button>

        {expanded ? (
          <div className="grid gap-3 pt-2 border-t border-[var(--hairline)]">
            {kind === "media_asset" && typeof output.url === "string" ? renderMediaPreview(modality, output) : null}

            {kind === "prompt_questions" ? renderQuestions(toolCall.id, output) : null}

            <pre className="overflow-x-auto rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/50 p-4 text-xs leading-relaxed text-[var(--ink)] font-mono">
              {prettyPrint(toolCall.output)}
            </pre>

            {kind === "prompt_json" ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-4 text-[10px] border-[var(--hairline)]"
                  onClick={() => void copyOutput(output)}
                >
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="h-8 px-4 text-[10px]"
                  onClick={() => onQuickCommand?.(`/generate-${modality} ${JSON.stringify(output)}`)}
                >
                  Generate {modality}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function summarizeToolCall(toolCall: AgentUiToolCall, output: Record<string, unknown>) {
  if (toolCall.status === "running") {
    return typeof output.activity === "string" ? output.activity : "working";
  }
  if (toolCall.status === "awaiting_approval") {
    return "draft ready";
  }
  if (toolCall.status === "approved") {
    return "Applied to project";
  }
  if (toolCall.status === "failed") {
    return "Tool failed";
  }
  if (toolCall.status === "awaiting_input") {
    const questions = Array.isArray(output.questions) ? output.questions.length : 0;
    return questions > 0 ? `awaiting input: ${questions} questions` : "awaiting input";
  }
  if (typeof output.summary === "string" && output.summary.trim()) {
    return output.summary;
  }
  if (typeof output.hook === "string" && output.hook.trim()) {
    return output.hook;
  }
  return "tool output";
}

function badgeClass(status: string) {
  if (status === "failed") {
    return "border border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--danger)] text-[10px] rounded-[var(--rounded-sm)]";
  }
  if (status === "awaiting_approval" || status === "awaiting_input") {
    return "border border-[var(--hairline)] bg-[var(--surface-soft)] text-amber-800 text-[10px] rounded-[var(--rounded-sm)]";
  }
  return "border border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--ink)]/80 text-[10px] rounded-[var(--rounded-sm)]";
}

function renderQuestions(toolCallId: string, output: Record<string, unknown>) {
  const questions = Array.isArray(output.questions) ? output.questions : [];

  return (
    <div className="grid gap-3 text-sm text-[var(--ink)]/90">
      <p className="text-[var(--muted)]">Reply in this thread with the missing details.</p>
      <ol className="grid gap-2 text-sm text-[var(--ink)]/90">
        {questions.map((question, index) => (
          <li key={`${toolCallId}-${index}`}>{index + 1}. {String(question)}</li>
        ))}
      </ol>
    </div>
  );
}

function renderMediaPreview(modality: string, output: Record<string, unknown>) {
  const url = typeof output.url === "string" ? output.url : "";
  const prompt = typeof output.prompt === "string" ? output.prompt : "";

  if (modality === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={prompt}
        className="aspect-video w-full rounded-[var(--rounded-md)] object-cover border border-[var(--hairline)] bg-[var(--surface-soft)]"
      />
    );
  }

  if (modality === "video") {
    return (
      <video
        src={url}
        controls
        className="aspect-video w-full rounded-[var(--rounded-md)] object-cover border border-[var(--hairline)] bg-[var(--surface-soft)]"
      />
    );
  }

  return (
    <audio
      src={url}
      controls
      className="w-full rounded-[var(--rounded-md)] py-2 px-1 border border-[var(--hairline)] bg-[var(--surface-soft)]"
    />
  );
}
