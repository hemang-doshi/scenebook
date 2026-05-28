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
const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/assets/asset-folders", () => ({
  ensureAssetInDefaultFolder,
  moveAssetToFolder,
  getDefaultAssetFolderName: vi.fn().mockReturnValue("DefaultFolder"),
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

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("generateProjectMedia shared service", () => {
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
    createSupabaseServerClient.mockReset();

    const mockSingle = vi.fn().mockResolvedValue({ data: { name: "MockFolder" }, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabase = {
      from: mockFrom,
    };

    getDefaultMediaModel.mockReturnValue({ id: "default-model", provider: "huggingface" });
    createGenerationRecord.mockResolvedValue({
      supabase: mockSupabase,
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

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: mockFrom,
    });
  });

  test("runs successfully and returns the standard output object", async () => {
    const { generateProjectMedia } = await import("@/lib/generation/generate-media");
    const result = await generateProjectMedia({
      projectId: "project-1",
      userId: "user-1",
      prompt: "macro bronze watch",
      modality: "image",
      folderId: "folder-123",
    });

    expect(result).toEqual({
      generationId: "generation-1",
      assetId: "asset-1",
      url: "https://example.com/generated.png",
      path: "project/generated.png",
      folderId: "folder-123",
      folderName: "MockFolder",
      model: "default-model",
      provider: "huggingface",
      prompt: "macro bronze watch",
    });

    expect(moveAssetToFolder).toHaveBeenCalledWith("project-1", "asset-1", "folder-123");
    expect(markGenerationCompleted).toHaveBeenCalledWith(
      "generation-1",
      expect.objectContaining({
        provider: "huggingface",
        assetPath: "project/generated.png",
        assetUrl: "https://example.com/generated.png",
        assetId: "asset-1",
      }),
    );
  });

  test("runs successfully with default folder resolution", async () => {
    ensureAssetInDefaultFolder.mockResolvedValue({ id: "default-folder-id", name: "DefaultFolder" });
    const { generateProjectMedia } = await import("@/lib/generation/generate-media");
    const result = await generateProjectMedia({
      projectId: "project-1",
      userId: "user-1",
      prompt: "macro bronze watch",
      modality: "image",
    });

    expect(result.folderId).toBe("default-folder-id");
    expect(result.folderName).toBe("DefaultFolder");
    expect(ensureAssetInDefaultFolder).toHaveBeenCalled();
  });

  test("calls markGenerationFailed on generation error", async () => {
    generateMediaWithHuggingFace.mockRejectedValue(new Error("HF limit reached"));

    const { generateProjectMedia } = await import("@/lib/generation/generate-media");
    await expect(
      generateProjectMedia({
        projectId: "project-1",
        userId: "user-1",
        prompt: "macro bronze watch",
        modality: "image",
      }),
    ).rejects.toThrow("HF limit reached");

    expect(markGenerationFailed).toHaveBeenCalledWith("generation-1", "HF limit reached");
  });
});
