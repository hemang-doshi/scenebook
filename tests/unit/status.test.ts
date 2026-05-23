import { describe, expect, test } from "vitest";

import {
  getAllowedStatusMoves,
  getCardReadiness,
  statusLabels,
} from "@/lib/domain/content";

describe("content workflow", () => {
  test("allows only adjacent moves plus archive for active cards", () => {
    expect(getAllowedStatusMoves("idea")).toEqual(["scripted", "archived"]);
    expect(getAllowedStatusMoves("editing")).toEqual([
      "shot",
      "posted",
      "archived",
    ]);
  });

  test("builds a readiness summary from script, shoot pack, and assets", () => {
    const readiness = getCardReadiness({
      scriptLab: {
        hook: "I stopped planning with fifteen tabs open.",
        script: "Start with the tab explosion, then show the fix.",
        angle: "",
        outline: "",
        caption: "",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      shootPack: {
        aRoll: [{ id: "a1", label: "Intro line", done: true }],
        bRoll: [{ id: "b1", label: "Screen recording", done: false }],
        screenCaptures: [],
        props: [],
        missingAssets: [],
        locationNotes: "",
        visualNotes: "",
      },
      assets: [{ id: "asset-1", type: "image", title: "Reference", url: "#" }],
    });

    expect(readiness.score).toBe(67);
    expect(readiness.label).toBe("Nearly ready");
    expect(readiness.missing).toContain("Complete every shoot checklist item");
  });

  test("keeps stable labels for board rendering", () => {
    expect(statusLabels.ready_to_shoot).toBe("Ready to Shoot");
    expect(statusLabels.analyzed).toBe("Analyzed");
  });
});
