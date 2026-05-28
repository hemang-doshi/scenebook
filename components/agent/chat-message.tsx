"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Bot, Sparkles, Copy, Check, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { AgentUiMessage } from "@/components/agent/agent-chat-island";
import type { Attachment } from "@/components/agent/agent-composer";

function parseInline(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const matches = text.split(regex);

  return matches.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-[var(--ink)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="bg-[rgba(0,0,0,0.06)] text-[var(--ink)] rounded px-1.5 py-0.5 text-xs font-mono border border-[rgba(0,0,0,0.04)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-3">
      <pre className="bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-md p-4 overflow-x-auto text-xs font-mono text-[var(--ink)]">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 p-1 rounded bg-[var(--canvas)] border border-[var(--hairline)] hover:border-[var(--ink)] text-[var(--muted)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  const renderedElements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushLists = (keyPrefix: string) => {
    if (inList) {
      renderedElements.push(
        <ul key={`ul-${keyPrefix}`} className="my-2 space-y-1.5 pl-5 list-disc text-[var(--ink)]/90">
          {listItems}
        </ul>
      );
      inList = false;
      listItems = [];
    }
    if (inOrderedList) {
      renderedElements.push(
        <ol key={`ol-${keyPrefix}`} className="my-2 space-y-1.5 pl-5 list-decimal text-[var(--ink)]/90">
          {listItems}
        </ol>
      );
      inOrderedList = false;
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        renderedElements.push(
          <CodeBlock key={`code-${i}`} code={codeBlockLines.join("\n")} />
        );
        codeBlockLines = [];
      } else {
        flushLists(`code-start-${i}`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      flushLists(`h3-${i}`);
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold mt-4 mb-2 text-[var(--ink)]">
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushLists(`h2-${i}`);
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-base font-extrabold mt-5 mb-2 text-[var(--ink)]">
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushLists(`h1-${i}`);
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-lg font-black mt-6 mb-3 text-[var(--ink)]">
          {parseInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Unordered lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      if (!inList) {
        flushLists(`ul-start-${i}`);
        inList = true;
      }
      const content = line.trim().startsWith("- ") ? line.trim().slice(2) : line.trim().slice(2);
      listItems.push(
        <li key={`li-${i}`} className="text-xs leading-relaxed text-[var(--ink)]/90">
          {parseInline(content)}
        </li>
      );
      continue;
    }

    // Ordered lists
    const olMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!inOrderedList) {
        flushLists(`ol-start-${i}`);
        inOrderedList = true;
      }
      listItems.push(
        <li key={`li-${i}`} className="text-xs leading-relaxed text-[var(--ink)]/90">
          {parseInline(olMatch[2])}
        </li>
      );
      continue;
    }

    // Paragraph or blank line
    flushLists(`para-${i}`);
    if (line.trim() === "") {
      renderedElements.push(<div key={`blank-${i}`} className="h-2" />);
    } else {
      renderedElements.push(
        <p key={`para-${i}`} className="text-xs leading-relaxed text-[var(--ink)]/90 my-1">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushLists("end");
  return renderedElements;
}

export function ChatMessage({
  message,
  index,
}: {
  message: AgentUiMessage;
  index: number;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.20, delay: Math.min(index * 0.02, 0.15) }}
        className="flex justify-end w-full"
      >
        <div className="max-w-[85%] px-4 py-3 rounded-lg border border-[var(--hairline)] bg-[var(--surface-soft)] text-xs text-[var(--ink)] shadow-none space-y-1">
          <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55 mb-1 justify-end">
            <span>You</span>
            <User className="h-3 w-3" />
          </div>
          <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>
          {!!(message.metadata?.attachments && Array.isArray(message.metadata.attachments)) && (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--hairline)] pt-2">
              {(message.metadata.attachments as Attachment[]).map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--canvas)] px-2.5 py-1 text-[10px] font-mono text-[var(--ink)]/80 hover:bg-[var(--surface-soft)] transition-all"
                >
                  <span>📎 {file.name.length > 15 ? file.name.substring(0, 12) + "..." : file.name}</span>
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
      className="flex justify-start w-full gap-3 py-2 items-start"
    >
      {/* Bot Icon Indicator */}
      <div className="h-7 w-7 rounded-md border border-[var(--hairline)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--primary)] shrink-0">
        <Bot className="h-4 w-4" />
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0 space-y-1 max-w-[min(48rem,100%)]">
        <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55 mb-1.5">
          <span>SceneBook Agent</span>
          <Sparkles className="h-3 w-3 text-[var(--primary)] animate-pulse" />
        </div>
        <div className="space-y-1 text-xs leading-relaxed text-[var(--ink)]/95">
          {parseMarkdown(message.content)}
        </div>
      </div>
    </motion.div>
  );
}
