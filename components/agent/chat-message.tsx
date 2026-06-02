"use client";

import React from "react";
import { motion } from "motion/react";
import { Bot, Sparkles, User } from "lucide-react";

import type { Attachment } from "@/components/agent/agent-composer";
import { MarkdownBlocks } from "@/components/agent/markdown-blocks";
import type { AgentUiMessage } from "@/components/agent/types";

export function ChatMessage({
  message,
  index,
}: {
  message: AgentUiMessage;
  index: number;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.20, delay: Math.min(index * 0.02, 0.15) }}
        className="flex w-full justify-end"
      >
        <div className="max-w-[85%] space-y-1 rounded-[var(--radius-lg)] border border-[rgba(17,19,24,.10)] bg-[rgba(255,253,248,.92)] px-4 py-3 text-xs text-[var(--light-ink)] shadow-[var(--shadow-soft)]">
          <div className="mb-1 flex items-center justify-end gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--light-muted)]">
            <span>You</span>
            <User className="h-3 w-3" />
          </div>
          <div className="space-y-1 text-[var(--light-ink)]">
            <MarkdownBlocks id={message.id} content={message.content} />
          </div>
          {!!(message.metadata?.attachments && Array.isArray(message.metadata.attachments)) && (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[rgba(17,19,24,.12)] pt-2">
              {(message.metadata.attachments as Attachment[]).map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[rgba(17,19,24,.12)] bg-[var(--white)] px-2.5 py-1 text-[10px] font-mono text-[var(--light-ink)]/80 transition-all hover:bg-[var(--bone)]"
                >
                  <span>📎 {file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.20, delay: Math.min(index * 0.02, 0.15) }}
      className="flex w-full items-start justify-start gap-3 py-2"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[rgba(105,167,255,.12)] text-[var(--blue-2)]">
        <Bot className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--muted)]">
          <Sparkles className="h-3 w-3 text-[var(--blue-2)]" />
          <span>SceneBook</span>
        </div>
        <div className="mt-1 text-[var(--ink)]">
          <MarkdownBlocks id={message.id} content={message.content} />
        </div>
      </div>
    </motion.div>
  );
}
