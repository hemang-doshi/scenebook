"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { AgentUiToolCall } from "@/components/agent/agent-chat-island";

function prettyPrint(value: unknown) {
  return JSON.stringify(value, null, 2);
}

interface GenerateToolOutput {
  url?: string;
  assetId?: string;
  model?: string;
  prompt?: string;
  folderName?: string;
  modality?: string;
}

export function ToolCallCard({ toolCall }: { toolCall: AgentUiToolCall }) {
  const isGenerate = toolCall.command === "generate";
  const output = toolCall.output as GenerateToolOutput;
  const hasAsset = output && output.url && output.assetId;

  if (isGenerate && hasAsset) {
    const url = output.url;
    const model = output.model || "Unknown model";
    const promptText = output.prompt || "";
    const folderName = output.folderName || "Default";
    const modality = output.modality || "image";

    let previewElement = null;
    if (modality === "image") {
      previewElement = (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={promptText}
          className="aspect-video w-full rounded-xl object-cover border border-border/40 shadow-inner bg-black/40"
        />
      );
    } else if (modality === "video") {
      previewElement = (
        <video
          src={url}
          controls
          className="aspect-video w-full rounded-xl object-cover border border-border/40 shadow-inner bg-black/40"
        />
      );
    } else if (modality === "audio") {
      previewElement = (
        <audio
          src={url}
          controls
          className="w-full rounded-xl py-2 px-1 border border-border/40 bg-black/40"
        />
      );
    }

    return (
      <Card className="border-border/70 bg-black/20 overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{toolCall.toolName}</CardTitle>
            <p className="mt-1 text-xs text-muted">
              {toolCall.command ? `/${toolCall.command}` : "tool"} • {toolCall.status}
            </p>
          </div>
          <Badge className="border-border/70 bg-black/20 text-[10px] text-muted">
            generated
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-foreground">
          {toolCall.errorMessage ? (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-100">
              {toolCall.errorMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-xl border border-border/40">
              {previewElement}
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-black/30 p-3 text-xs leading-normal">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted mb-0.5">Model</span>
                <span className="font-mono text-foreground font-medium truncate block">{model}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[10px] uppercase tracking-wider text-muted mb-0.5">Folder</span>
                <span className="text-foreground font-medium truncate block">{folderName}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-black/30 p-3 text-xs">
              <span className="block text-[10px] uppercase tracking-wider text-muted mb-1">Prompt</span>
              <p className="text-muted leading-relaxed italic">{promptText}</p>
            </div>

            <div className="flex justify-end pt-1">
              <Button disabled className="h-8 rounded-full bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 text-[10px] font-semibold px-3 uppercase tracking-wider font-mono">
                Use in editor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-black/20">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{toolCall.toolName}</CardTitle>
          <p className="mt-1 text-xs text-muted">
            {toolCall.command ? `/${toolCall.command}` : "tool"} • {toolCall.status}
          </p>
        </div>
        <Badge className="border-border/70 bg-black/20 text-[10px] text-muted">
          {toolCall.requiresApproval ? "approval" : "deterministic"}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-foreground">
        {toolCall.errorMessage ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-100">
            {toolCall.errorMessage}
          </p>
        ) : null}
        <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-black/30 p-3 text-xs leading-6 text-muted">
          {prettyPrint(toolCall.output)}
        </pre>
      </CardContent>
    </Card>
  );
}
