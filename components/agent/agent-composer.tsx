"use client";

import { Loader2, Paperclip, Plus, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ModelAccordion, type AgentModelSelection } from "@/components/agent/model-accordion";
import { commandCatalog, SlashCommandMenu } from "@/components/agent/slash-command-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

const VALID_COMMANDS = commandCatalog.map((item) => item.command.slice(1));

export function AgentComposer({
  value,
  onChange,
  onSubmit,
  isSending,
  models,
  onModelsChange,
  onQuickCommand,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const commandMatch = VALID_COMMANDS.find(
    (cmd) => value.startsWith(`/${cmd} `) || value === `/${cmd}`,
  );
  const activeCommand = commandMatch || null;
  const textareaValue = commandMatch
    ? value.startsWith(`/${commandMatch} `)
      ? value.substring(commandMatch.length + 2)
      : ""
    : value;

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const maxHeight = large ? 216 : 168;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 64), maxHeight);
    textarea.style.height = `${nextHeight}px`;
  }, [large]);

  useEffect(() => {
    syncTextareaHeight();
  }, [syncTextareaHeight, textareaValue]);

  const handleTextareaChange = (newText: string) => {
    if (activeCommand) {
      onChange(`/${activeCommand} ${newText}`);
    } else {
      onChange(newText);
    }
  };

  const handleQuickCommand = (command: string) => {
    setActionMenuOpen(false);
    onQuickCommand(command);
    requestAnimationFrame(() => textareaRef.current?.focus());
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
      const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
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
    if (
      attachmentToRemove &&
      attachmentToRemove.url.startsWith("blob:") &&
      typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(attachmentToRemove.url);
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== indexToRemove));
  };

  const isSubmitDisabled = isSending || (!value.trim() && attachments.length === 0);

  return (
    <div
      data-agent-composer="true"
      className="relative rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-[rgba(20,24,33,.82)] px-2.5 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-[18px] transition-colors focus-within:border-[var(--line-strong)]"
    >
      <div className="grid gap-2">
        {(activeCommand || attachments.length > 0) && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {activeCommand && (
              <div className="flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--coral)] px-2.5 py-1 text-[11px] font-mono text-[#120a07] shadow-sm">
                <span className="truncate">/{activeCommand}</span>
                <button
                  type="button"
                  onClick={handleRemoveCommand}
                  className="shrink-0 rounded-sm text-[var(--on-primary)]/70 transition-colors hover:text-[var(--on-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--on-primary)]/40"
                  aria-label="Remove command"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {attachments.map((file, i) => (
              <div
                key={`${file.name}-${file.url}-${i}`}
                className="flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--line)] bg-[rgba(255,255,255,.055)] px-2.5 py-1 text-[11px] font-mono text-[var(--ink)]/80"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-[var(--ink)]/50" />
                <span className="max-w-[11rem] truncate" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(i)}
                  className="shrink-0 rounded-sm text-[var(--ink)]/40 transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/15"
                  aria-label={`Remove attachment ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <div className="relative shrink-0">
            <Button
              type="button"
              variant="secondary"
              aria-label="Open action menu"
              aria-expanded={actionMenuOpen}
              aria-haspopup="menu"
              title="Actions"
              onClick={() => setActionMenuOpen((current) => !current)}
              className="h-9 min-h-9 w-9 rounded-[var(--radius-md)] border-[var(--line)] bg-[rgba(255,255,255,.052)] px-0 py-0 focus-visible:ring-0"
            >
              <Plus className="h-4 w-4 text-[var(--ink)]/75" />
            </Button>

            {actionMenuOpen ? (
              <div
                role="menu"
                aria-label="Agent actions"
                className="absolute bottom-[calc(100%+0.6rem)] left-0 z-40 w-[min(16rem,calc(100vw-1.5rem))] rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(20,24,33,.96)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-[18px] animate-[ed-fadeIn_0.15s_ease-out]"
              >
                <div className="grid max-h-72 gap-0.5 overflow-y-auto pr-1 scrollbar-thin">
                  {commandCatalog.map((item) => (
                    <Button
                      key={item.command}
                      type="button"
                      variant="ghost"
                      onClick={() => handleQuickCommand(item.command)}
                      className="h-8 min-h-8 w-full justify-start rounded-[var(--radius-sm)] px-2 text-left normal-case tracking-[0] hover:bg-[rgba(255,255,255,.055)] focus-visible:ring-0"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-16 shrink-0 truncate font-mono text-[10px] font-semibold text-[var(--ink)]">
                          {item.label}
                        </span>
                        <span className="truncate text-[11px] leading-none text-[var(--muted)]">
                          {item.description}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              aria-label="Agent prompt"
              rows={1}
              value={textareaValue}
              onChange={(event) => handleTextareaChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeCommand
                  ? `Type parameters for /${activeCommand}...`
                  : "Ask the agent..."
              }
              className={cn(
                "block min-h-16 w-full resize-none overflow-y-auto border-0 bg-transparent px-1 py-2 text-sm leading-5 tracking-[0] text-[var(--ink)] outline-none placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                large ? "max-h-[13.5rem]" : "max-h-[10.5rem]",
              )}
            />
            <SlashCommandMenu input={value} onSelect={handleQuickCommand} />
          </div>

          <div className="flex shrink-0 items-end gap-1.5">
            <ModelAccordion models={models} onChange={onModelsChange} />
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
              title="Attach files"
              onClick={handleAttachmentClick}
              className="h-9 min-h-9 w-9 rounded-[var(--radius-md)] border-[var(--line)] bg-[rgba(255,255,255,.052)] px-0 py-0 focus-visible:ring-0"
            >
              <Paperclip className="h-4 w-4 text-[var(--ink)]/70 transition-colors hover:text-[var(--ink)]" />
            </Button>
            <Button
              variant="primary"
              aria-label="Send message"
              title="Send message"
              disabled={isSubmitDisabled}
              onClick={onSubmit}
              className="h-9 min-h-9 w-9 justify-center rounded-[var(--radius-md)] px-0 py-0 focus-visible:ring-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--on-primary)]" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
