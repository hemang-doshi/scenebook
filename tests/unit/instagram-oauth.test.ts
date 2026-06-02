import { describe, expect, test } from "vitest";

import {
  buildInstagramRequestOrigin,
  normalizeInstagramOAuthError,
} from "@/lib/instagram/oauth";

describe("Instagram OAuth helpers", () => {
  test("uses forwarded https origin for ngrok hosts", () => {
    expect(buildInstagramRequestOrigin(new Headers({
      "x-forwarded-host": "scenebook.ngrok-free.app",
      "x-forwarded-proto": "https",
    }))).toBe("https://scenebook.ngrok-free.app");
  });

  test("uses http for localhost hosts", () => {
    expect(buildInstagramRequestOrigin(new Headers({
      host: "127.0.0.1:3000",
      "x-forwarded-proto": "http",
    }))).toBe("http://127.0.0.1:3000");
  });

  test("maps api access blocked into actionable recovery guidance", () => {
    expect(normalizeInstagramOAuthError("API access blocked: app must complete review.")).toMatchObject({
      code: "api_access_blocked",
      title: "Meta access blocked",
      action: expect.stringMatching(/app review|eligibility/i),
    });
  });
});
