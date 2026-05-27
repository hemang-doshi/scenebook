import { beforeEach, describe, expect, test, vi } from "vitest";

const ensureAssetInDefaultFolder = vi.fn();
const moveAssetToFolder = vi.fn();
const createGeneratedAssetRecord = vi.fn();
const createGenerationRecord = vi.fn();
const generateMediaWithHuggingFace = vi.fn();
const getActiveProviderToken = vi.fn();
const getDefaultMediaModel = vi.fn();
const loadCreatorSettingsRow = vi.fn();
const markGenerationCompleted = vi.fn();
const markGenerationFailed = vi.fn();
const uploadGeneratedAsset = vi.fn();

vi.mock("@/lib/assets/asset-folders", () => ({
  ensureAssetInDefaultFolder,
  moveAssetToFolder,
}));

vi.mock("@/lib/ai/huggingface", () => ({
  generateMediaWithHuggingFace,
}));

vi.mock("@/lib/ai/model-registry", () => ({
  mediaModalities: ["image", "video", "audio"],
  getDefaultMediaModel,
}));

vi.mock("@/lib/creator-settings", () => ({
  getActiveProviderToken,
}));

vi.mock("@/lib/project-service", () => ({
  createGeneratedAssetRecord,
  createGenerationRecord,
  loadCreatorSettingsRow,
  markGenerationCompleted,
  markGenerationFailed,
  uploadGeneratedAsset,
}));

describe("POST /api/projects/[id]/generations", () => {
  beforeEach(() => {
    vi.resetModules();
    ensureAssetInDefaultFolder.mockReset();
    moveAssetToFolder.mockReset();
    createGeneratedAssetRecord.mockReset();
    createGenerationRecord.mockReset();
    generateMediaWithHuggingFace.mockReset();
    getActiveProviderToken.mockReset();
    getDefaultMediaModel.mockReset();
    loadCreatorSettingsRow.mockReset();
    markGenerationCompleted.mockReset();
    markGenerationFailed.mockReset();
    uploadGeneratedAsset.mockReset();

    getDefaultMediaModel.mockReturnValue({ id: "default-model", provider: "huggingface" });
    createGenerationRecord.mockResolvedValue({
      supabase: {},
      user: { id: "user-1" },
      generation: { id: "generation-1" },
    });
    loadCreatorSettingsRow.mockResolvedValue({});
    getActiveProviderToken.mockReturnValue("hf-token");
    generateMediaWithHuggingFace.mockResolvedValue({
      blob: new Blob(["image"], { type: "image/png" }),
      extension: "png",
      contentType: "image/png",
    });
    uploadGeneratedAsset.mockResolvedValue({
      publicUrl: "https://example.com/generated.png",
      path: "project/generated.png",
    });
    createGeneratedAssetRecord.mockResolvedValue({
      id: "asset-1",
      type: "image",
    });
  });

  test("uses an explicit folder id when provided", async () => {
    const { POST } = await import("@/app/api/projects/[id]/generations/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt: "macro bronze watch",
          modality: "image",
          folderId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(moveAssetToFolder).toHaveBeenCalledWith(
      "project-1",
      "asset-1",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(ensureAssetInDefaultFolder).not.toHaveBeenCalled();
  });

  test("falls back to the default modality folder when no folder id is provided", async () => {
    const { POST } = await import("@/app/api/projects/[id]/generations/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt: "macro bronze watch",
          modality: "image",
          title: "Hero still",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(ensureAssetInDefaultFolder).toHaveBeenCalledWith({
      projectId: "project-1",
      assetId: "asset-1",
      type: "image",
      title: "Hero still",
      modality: "image",
    });
    expect(moveAssetToFolder).not.toHaveBeenCalled();
  });
});
