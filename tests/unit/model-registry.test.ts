import { describe, expect, test } from "vitest";

import { getDefaultMediaModel, getMediaModelPresets } from "@/lib/ai/model-registry";

describe("media model registry", () => {
  test("returns curated presets per modality", () => {
    expect(getMediaModelPresets("image").length).toBeGreaterThan(0);
    expect(getMediaModelPresets("audio").every((model) => model.modality === "audio")).toBe(true);
    expect(getMediaModelPresets("video").every((model) => model.modality === "video")).toBe(true);
  });

  test("provides a default model for each supported modality", () => {
    expect(getDefaultMediaModel("image").id).toBeTruthy();
    expect(getDefaultMediaModel("audio").id).toBeTruthy();
    expect(getDefaultMediaModel("video").id).toBeTruthy();
  });
});
