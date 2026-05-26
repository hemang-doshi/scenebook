import { describe, expect, test } from "vitest";

import { mapCardRow, mapProjectSummary } from "@/lib/data/mappers";

describe("row mappers", () => {
  test("maps a Supabase row into the app card shape", () => {
    const card = mapCardRow({
      id: "card-1",
      owner_id: "user-1",
      inbox_item_id: "inbox-1",
      title: "One line upgrade to my filming checklist",
      status: "posted",
      format: "reel",
      platform: "instagram",
      topic_tags: ["workflow"],
      experiment_tags: ["hook-test"],
      script_lab: {
        hook: "The checklist line I never skip anymore",
        script: "Before I film, I say this out loud.",
      },
      shoot_pack: {
        aRoll: [],
        bRoll: [],
      },
      analytics_journal: {
        views: 3200,
        likes: 210,
      },
      ai_suggestions: {
        hooks: ["What changed everything for me was one checklist line."],
      },
      created_at: "2026-05-22T10:00:00.000Z",
      updated_at: "2026-05-22T12:00:00.000Z",
    });

    expect(card.ownerId).toBe("user-1");
    expect(card.inboxItemId).toBe("inbox-1");
    expect(card.topicTags).toEqual(["workflow"]);
    expect(card.analyticsJournal.views).toBe(3200);
    expect(card.aiSuggestions.hooks).toHaveLength(1);
  });

  test("maps a project summary without full card detail payload", () => {
    const summary = mapProjectSummary(
      {
        id: "card-2",
        title: "Project-first workspace refresh",
        status: "editing",
        format: "short",
        platform: "youtube",
        updated_at: "2026-05-26T10:00:00.000Z",
      },
      3,
    );

    expect(summary).toEqual({
      id: "card-2",
      title: "Project-first workspace refresh",
      status: "editing",
      format: "short",
      platform: "youtube",
      assetCount: 3,
      updatedAt: "2026-05-26T10:00:00.000Z",
    });
  });
});
