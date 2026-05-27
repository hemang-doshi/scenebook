"use client";

import React from "react";
import { motion } from "motion/react";

import { Card } from "@/components/ui/card";

import type { AgentUiMessage } from "@/components/agent/agent-chat-island";

function parseInline(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const matches = text.split(regex);

  return matches.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="bg-black/45 text-accent rounded px-1.5 py-0.5 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
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
        <ul key={`ul-${keyPrefix}`} className="my-2 space-y-1 pl-5 list-disc text-foreground/90">
          {listItems}
        </ul>
      );
      inList = false;
      listItems = [];
    }
    if (inOrderedList) {
      renderedElements.push(
        <ol key={`ol-${keyPrefix}`} className="my-2 space-y-1 pl-5 list-decimal text-foreground/90">
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
          <pre key={`code-${i}`} className="bg-black/50 border border-border/60 rounded-lg p-3 my-3 overflow-x-auto text-xs font-mono text-accent">
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
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
        <h3 key={`h3-${i}`} className="text-base font-semibold mt-4 mb-2 text-foreground">
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushLists(`h2-${i}`);
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold mt-5 mb-2 text-foreground">
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushLists(`h1-${i}`);
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-black mt-6 mb-3 text-foreground">
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
        <li key={`li-${i}`} className="text-sm leading-6 text-foreground/90">
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
        <li key={`li-${i}`} className="text-sm leading-6 text-foreground/90">
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
        <p key={`para-${i}`} className="text-sm leading-6 text-foreground/90 my-1">
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18) }}
      className={isUser ? "flex justify-end" : "flex justify-start"}
    >
      <Card
        className={[
          "max-w-[min(46rem,100%)] px-5 py-4",
          isUser ? "border-accent/25 bg-accent/12" : "border-border/70 bg-black/20",
        ].join(" ")}
      >
        <p className="cmd-label mb-3 text-[10px] text-muted">
          {isUser ? "You" : message.role === "assistant" ? "SceneBook Agent" : "System"}
        </p>
        <div className="space-y-1 text-[15px] leading-7 text-foreground/90">
          {parseMarkdown(message.content)}
        </div>
      </Card>
    </motion.div>
  );
}
