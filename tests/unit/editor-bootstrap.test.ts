import { describe, expect, test } from "vitest";

import { orderEditorAssets } from "@/lib/editor/bootstrap";

describe("editor bootstrap", () => {
  test("prioritizes the focused asset first without dropping other assets", () => {
    const ordered = orderEditorAssets(
      [
        { id: "asset-1", title: "A" },
        { id: "asset-2", title: "B" },
        { id: "asset-3", title: "C" },
      ],
      "asset-2",
    );

    expect(ordered.map((asset) => asset.id)).toEqual(["asset-2", "asset-1", "asset-3"]);
  });
});
