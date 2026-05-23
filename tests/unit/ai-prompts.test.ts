import { describe, expect, test } from "vitest";

import { buildAssistPrompt } from "@/lib/ai/prompts";
import type { ContentCard } from "@/lib/types";

const card: Pick<
  ContentCard,
  "title" | "platform" | "format" | "topicTags" | "scriptLab" | "analyticsJournal"
> = {
  title: "Desk setup tweaks I wish I made earlier",
  platform: "youtube",
  format: "short",
  topicTags: ["workspace", "creator systems"],
  scriptLab: {
    angle: "Make the advice feel earned, not aesthetic for its own sake.",
    hook: "Three fixes that made filming at my desk less annoying.",
    outline: "Pain, fix one, fix two, fix three, payoff",
    script: "I thought I needed a new camera. I really needed a better light angle.",
    caption: "Small setup fixes, noticeably better footage.",
    onScreenText: "Fix 1: move the lamp off-axis",
    cta: "Save this before your next filming day.",
    notes: "No gear shaming.",
  },
  analyticsJournal: {
    views: 9100,
    likes: 530,
    comments: 19,
    shares: 31,
    saves: 74,
    watchTimeNote: "Retention dipped after the second fix.",
    reflection: "The best-performing segment was practical, not aesthetic.",
    decision: "remix",
    followUpIdea: "Lighting mistakes creators make in home offices",
  },
};

describe("ai prompts", () => {
  test("builds a hook prompt that preserves creator authorship", () => {
    const prompt = buildAssistPrompt("hooks", card);

    expect(prompt).toContain("Return suggestions only");
    expect(prompt).toContain(card.scriptLab.hook);
    expect(prompt).toContain("do not overwrite the creator's original text");
  });

  test("builds a performance summary prompt from manual metrics", () => {
    const prompt = buildAssistPrompt("performance-summary", card);

    expect(prompt).toContain("Views: 9100");
    expect(prompt).toContain("Decision: remix");
    expect(prompt).toContain("follow-up idea");
  });
});
