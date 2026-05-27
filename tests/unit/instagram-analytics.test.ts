import { describe, expect, test } from "vitest";

import {
  getInstagramInsightIssueLabel,
  normalizeInstagramInsightError,
} from "@/lib/domain/instagram-analytics";

describe("Instagram analytics helpers", () => {
  test("preserves unsupported metric errors as generic insight failures", () => {
    const message = "The Media Insights API does not support the plays metric for this media product type.";

    expect(normalizeInstagramInsightError(message)).toBe(message);
    expect(getInstagramInsightIssueLabel(message)).toBe("Insights unavailable");
  });

  test("identifies true pre-conversion insight errors", () => {
    const message =
      "The media was posted before the most recent time that the user's account was converted to a business account from a personal account.";

    expect(normalizeInstagramInsightError(message)).toBe(
      "This post was created prior to converting to a creator/professional account, so detailed metrics are unavailable.",
    );
    expect(getInstagramInsightIssueLabel(message)).toBe("Pre-conversion post");
  });
});
