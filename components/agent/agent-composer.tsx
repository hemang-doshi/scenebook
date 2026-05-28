"use client";

import Link from "next/link";
import { Loader2, Send, Paperclip, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { ModelAccordion, type AgentModelSelection } from "@/components/agent/model-accordion";
import { SlashCommandMenu } from "@/components/agent/slash-command-menu";

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

const VALID_COMMANDS = [
  "script",
  "form-json-prompt",
  "generate",
  "generate-image",
  "generate-video",
  "generate-audio",
  "storyboard",
  "tasks",
  "instagram",
  "analyze",
  "import-to-editor",
  "export",
];

const QUICK_ACTIONS = [
  { label: "Script", command: "/script" },
  { label: "Prompt", command: "/form-json-prompt" },
  { label: "Storyboard", command: "/storyboard" },
  { label: "Tasks", command: "/tasks" },
  { label: "Generate", command: "/generate" },
] as const;

export function AgentComposer({
  value,
  onChange,
  onSubmit,
  isSending,
  models,
  onModelsChange,
  onQuickCommand,
  editorHref,
  large = false,
  attachments,
  onAttachmentsChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  models: AgentModelSelection;
  onModelsChange: (next: AgentModelSelection) => void;
  onQuickCommand: (command: string) => void;
  editorHref?: string;
  large?: boolean;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commandMatch = VALID_COMMANDS.find(
    (cmd) => value.startsWith(`/${cmd} `) || value === `/${cmd}`
  );
  const activeCommand = commandMatch || null;
  const textareaValue = commandMatch
    ? value.startsWith(`/${commandMatch} `)
      ? value.substring(commandMatch.length + 2)
      : ""
    : value;

  const handleTextareaChange = (newText: string) => {
    if (activeCommand) {
      onChange(`/${activeCommand} ${newText}`);
    } else {
      onChange(newText);
    }
  };

  const handleRemoveCommand = () => {
    onChange("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Backspace" && textareaValue === "" && activeCommand) {
      event.preventDefault();
      onChange("");
    } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newAttachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url,
      });
    }

    onAttachmentsChange([...attachments, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    const attachmentToRemove = attachments[indexToRemove];
    if (attachmentToRemove && attachmentToRemove.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachmentToRemove.url);
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== indexToRemove));
  };

  return (
    <Card className="border border-[var(--hairline)] bg-[var(--canvas)] p-4 rounded-[var(--rounded-lg)] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
      <div className="grid gap-3">
        {/* Command Pill & Attachments Row */}
        {(activeCommand || attachments.length > 0) && (
          <div className="flex flex-wrap gap-2 px-1 pb-1">
            {activeCommand && (
              <div className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-mono text-[var(--on-primary)] shadow-sm">
                <span className="text-[var(--on-primary)]/60">/</span>
                <span>{activeCommand}</span>
                <button
                  type="button"
                  onClick={handleRemoveCommand}
                  className="ml-1 text-[var(--on-primary)]/70 hover:text-[var(--on-primary)] transition-colors"
                  aria-label="Remove command"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-mono text-[var(--ink)]/80 shadow-sm"
              >
                <span>📎 {file.name.length > 18 ? file.name.substring(0, 15) + "..." : file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(i)}
                  className="ml-1 text-[var(--ink)]/40 hover:text-[var(--ink)] transition-colors"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Textarea
            value={textareaValue}
            onChange={(event) => handleTextareaChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeCommand
                ? `Type parameters for /${activeCommand}...`
                : "Ask the agent for the next beat, prompt bundle, storyboard, or a sharper cut."
            }
            className={[
              "max-h-64 resize-none rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/10 focus-visible:border-[var(--ink)]",
              large ? "min-h-[7.5rem]" : "min-h-[5.5rem]",
            ].join(" ")}
          />
          <SlashCommandMenu input={value} onSelect={onQuickCommand} />
        </div>

        <div className="flex flex-wrap gap-1.5 px-1">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.command}
              type="button"
              variant="secondary"
              onClick={() => onQuickCommand(action.command)}
              className="h-8 border border-[var(--hairline)] bg-[var(--canvas)] hover:bg-[var(--surface-soft)] hover:border-[var(--ink)] px-3.5 text-[10px] font-mono text-[var(--ink)]/70 hover:text-[var(--ink)]"
            >
              {action.command}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/40 px-4 py-3">
          <div className="flex items-center gap-2">
            {editorHref ? (
              <Link href={editorHref}>
                <Button variant="secondary" className="h-8 px-3 text-[10px] font-mono border-[var(--hairline)] hover:border-[var(--ink)]">
                  Open editor
                </Button>
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden text-[11px] text-[var(--muted)] md:block font-sans">
              Use `/` commands. Submit with Cmd/Ctrl+Enter.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Button
              type="button"
              variant="secondary"
              aria-label="Attach files"
              onClick={handleAttachmentClick}
              className="h-9 w-9 px-0 border border-[var(--hairline)] bg-[var(--canvas)] hover:bg-[var(--surface-soft)]"
            >
              <Paperclip className="h-4 w-4 text-[var(--ink)]/70 hover:text-[var(--ink)] transition-colors" />
            </Button>
            <Button
              variant="primary"
              aria-label="Send message"
              disabled={isSending || (!value.trim() && attachments.length === 0)}
              onClick={onSubmit}
              className="h-9 w-9 px-0 justify-center"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin text-[var(--on-primary)]" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
