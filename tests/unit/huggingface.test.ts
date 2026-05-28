import { beforeEach, describe, expect, test, vi } from "vitest";

const textToImage = vi.fn();
const textToVideo = vi.fn();
const textToSpeech = vi.fn();

vi.mock("@huggingface/inference", () => ({
  InferenceClient: vi.fn(function InferenceClient() {
    return {
      textToImage,
      textToVideo,
      textToSpeech,
    };
  }),
}));

describe("generateMediaWithHuggingFace", () => {
  beforeEach(() => {
    vi.resetModules();
    textToImage.mockReset();
    textToVideo.mockReset();
    textToSpeech.mockReset();
    textToImage.mockResolvedValue(new Blob(["image"], { type: "image/png" }));
    textToVideo.mockResolvedValue(new Blob(["video"], { type: "video/mp4" }));
    textToSpeech.mockResolvedValue(new Blob(["audio"], { type: "audio/wav" }));
  });

  test("generic requests omit the huggingface provider arg", async () => {
    const { generateMediaWithHuggingFace } = await import("@/lib/ai/huggingface");

    await generateMediaWithHuggingFace({
      token: "hf-token",
      modality: "image",
      model: "Qwen/Qwen-Image",
      prompt: "beach sunset",
      provider: "huggingface",
    });

    expect(textToImage).toHaveBeenCalledWith({
      model: "Qwen/Qwen-Image",
      inputs: "beach sunset",
    });
  });

  test("provider-specific requests pass supported provider ids through", async () => {
    const { generateMediaWithHuggingFace } = await import("@/lib/ai/huggingface");

    await generateMediaWithHuggingFace({
      token: "hf-token",
      modality: "image",
      model: "black-forest-labs/FLUX.1-dev",
      prompt: "beach sunset",
      provider: "replicate",
    });

    expect(textToImage).toHaveBeenCalledWith({
      model: "black-forest-labs/FLUX.1-dev",
      inputs: "beach sunset",
      provider: "replicate",
    });
  });
});
