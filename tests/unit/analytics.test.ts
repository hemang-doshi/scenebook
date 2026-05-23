import { describe, expect, test } from "vitest";

import { deriveNextFocus, summarizeMetrics } from "@/lib/domain/analytics";

describe("analytics helpers", () => {
  test("summarizes engagement ratios and momentum", () => {
    const summary = summarizeMetrics({
      views: 10000,
      likes: 900,
      comments: 60,
      shares: 90,
      saves: 140,
    });

    expect(summary.engagementRate).toBe("11.90%");
    expect(summary.saveRate).toBe("1.40%");
    expect(summary.momentum).toBe("High");
  });

  test("derives the next focus from reflection and decision", () => {
    const focus = deriveNextFocus({
      reflection: "Fast cuts worked, but the CTA landed too late.",
      decision: "remix",
      followUpIdea: "Rebuild the same piece with the CTA in the first beat",
    });

    expect(focus).toContain("Remix");
    expect(focus).toContain("CTA in the first beat");
  });
});
