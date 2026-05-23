import { describe, expect, test } from "vitest";

import {
  createInboxItemSchema,
  createNoteCardFromInboxSchema,
  updateContentCardSchema,
} from "@/lib/validation";

describe("validation", () => {
  test("rejects an empty inbox capture", () => {
    const result = createInboxItemSchema.safeParse({
      title: "   ",
      notes: "",
      sourceType: "text",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("title");
  });

  test("requires a card title when converting an inbox item", () => {
    const result = createNoteCardFromInboxSchema.safeParse({
      inboxItemId: "inbox-1",
      title: "",
      format: "reel",
      platform: "instagram",
    });

    expect(result.success).toBe(false);
  });

  test("accepts a content card update with structured script and analytics fields", () => {
    const result = updateContentCardSchema.safeParse({
      title: "Walkthrough: keyboard shortcuts that save me an hour",
      status: "ready_to_shoot",
      topicTags: ["productivity", "workflow"],
      scriptLab: {
        angle: "Show practical time savings instead of generic tips.",
        hook: "Three shortcuts I use before opening Slack.",
        outline: "Problem, demo, payoff",
        script: "Open with calendar chaos, then show the shortcuts.",
        caption: "Shortcuts > hacks. Here are mine.",
        onScreenText: "Shortcut #1: search like a terminal",
        cta: "Comment your favorite shortcut.",
        notes: "Keep this under 35 seconds.",
      },
      analyticsJournal: {
        views: 12500,
        likes: 840,
        comments: 46,
        shares: 77,
        saves: 119,
        watchTimeNote: "Strong hold in first 6 seconds",
        reflection: "Fast pacing worked better than usual.",
        decision: "repeat",
        followUpIdea: "Part two with browser shortcuts",
      },
    });

    expect(result.success).toBe(true);
  });
});
