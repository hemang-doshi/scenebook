"use client";

import React, { memo, useState } from "react";
import { Check, Copy } from "lucide-react";

function parseInline(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-current">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded border border-[var(--line)] bg-[rgba(255,255,255,.055)] px-1.5 py-0.5 text-xs font-mono text-current"
        >
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
    <div className="group relative my-3">
      <pre className="overflow-x-auto rounded-md border border-[var(--line)] bg-[rgba(255,255,255,.055)] p-4 text-xs font-mono text-current">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded border border-[var(--line)] bg-[rgba(255,255,255,.055)] p-1 text-[var(--muted)] opacity-0 transition-all duration-200 hover:border-[var(--line-strong)] hover:text-current group-hover:opacity-100"
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function renderBlocks(content: string) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (key: string) => {
    if (!listType || listItems.length === 0) return;

    const Tag = listType;
    const listClassName =
      listType === "ul"
        ? "my-2 list-disc space-y-1.5 pl-5 text-current"
        : "my-2 list-decimal space-y-1.5 pl-5 text-current";

    blocks.push(
      <Tag key={`${listType}-${key}`} className={listClassName}>
        {listItems}
      </Tag>,
    );

    listItems = [];
    listType = null;
  };

  const flushCodeBlock = (key: string) => {
    if (!inCodeBlock) return;
    blocks.push(<CodeBlock key={`code-${key}`} code={codeBlockLines.join("\n")} />);
    codeBlockLines = [];
    inCodeBlock = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(`${index}`);
      } else {
        flushList(`code-${index}`);
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushList(`hr-${index}`);
      blocks.push(<hr key={`hr-${index}`} className="my-3 border-[var(--hairline)]" />);
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushList(`quote-${index}`);
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="my-2 border-l-2 border-[var(--primary)]/40 pl-3 text-xs leading-relaxed text-current/80"
        >
          {parseInline(trimmed.replace(/^>\s?/, ""))}
        </blockquote>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushList(`h3-${index}`);
      blocks.push(
        <h3 key={`h3-${index}`} className="mb-2 mt-4 text-sm font-bold text-current">
          {parseInline(line.slice(4))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList(`h2-${index}`);
      blocks.push(
        <h2 key={`h2-${index}`} className="mb-2 mt-5 text-base font-extrabold text-current">
          {parseInline(line.slice(3))}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushList(`h1-${index}`);
      blocks.push(
        <h1 key={`h1-${index}`} className="mb-3 mt-6 text-lg font-black text-current">
          {parseInline(line.slice(2))}
        </h1>,
      );
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (listType !== "ul") {
        flushList(`ul-start-${index}`);
        listType = "ul";
      }
      listItems.push(
        <li key={`li-${index}`} className="text-xs leading-relaxed text-current">
          {parseInline(trimmed.slice(2))}
        </li>,
      );
      continue;
    }

    const orderedListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedListMatch) {
      if (listType !== "ol") {
        flushList(`ol-start-${index}`);
        listType = "ol";
      }
      listItems.push(
        <li key={`li-${index}`} className="text-xs leading-relaxed text-current">
          {parseInline(orderedListMatch[2])}
        </li>,
      );
      continue;
    }

    flushList(`para-${index}`);

    if (trimmed === "") {
      blocks.push(<div key={`blank-${index}`} className="h-2" />);
      continue;
    }

    blocks.push(
      <p key={`para-${index}`} className="my-1 text-xs leading-relaxed text-current">
        {parseInline(line)}
      </p>,
    );
  }

  flushList("end");
  if (inCodeBlock) {
    flushCodeBlock("streaming");
  }

  return blocks;
}

export const MarkdownBlocks = memo(function MarkdownBlocks({
  content,
  id,
}: {
  content: string;
  id: string;
}) {
  return <div data-markdown-id={id}>{renderBlocks(content)}</div>;
});
