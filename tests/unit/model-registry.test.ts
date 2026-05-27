import { describe, expect, test } from "vitest";

import {
  getDefaultChatModel,
  getDefaultMediaModel,
  getMediaModelPresets,
  getModelsForAccordion,
} from "@/lib/ai/model-registry";

describe("model registry", () => {
  test("provides a default chat model", () => {
    expect(getDefaultChatModel().id).toBeTruthy();
  });

  test("returns curated presets per media modality", () => {
    expect(getMediaModelPresets("image").length).toBeGreaterThan(0);
    expect(getMediaModelPresets("video").length).toBeGreaterThan(0);
    expect(getMediaModelPresets("audio").length).toBeGreaterThan(0);
  });

  test("provides a default model for each supported media modality", () => {
    expect(getDefaultMediaModel("image").id).toBeTruthy();
    expect(getDefaultMediaModel("video").id).toBeTruthy();
    expect(getDefaultMediaModel("audio").id).toBeTruthy();
  });

  test("returns accordion groups for chat and all media modalities", () => {
    const groups = getModelsForAccordion();

    expect(groups.chat.length).toBeGreaterThan(0);
    expect(groups.image.length).toBeGreaterThan(0);
    expect(groups.video.length).toBeGreaterThan(0);
    expect(groups.audio.length).toBeGreaterThan(0);
  });
});
