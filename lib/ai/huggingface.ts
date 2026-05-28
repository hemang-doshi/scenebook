/* eslint-disable @typescript-eslint/no-explicit-any */
import { InferenceClient } from "@huggingface/inference";

import type { MediaModality } from "@/lib/ai/model-registry";

export type HuggingFaceGenerationRequest = {
  token: string;
  modality: MediaModality;
  model: string;
  prompt: string;
  provider?: string;
};

function getFileExtension(contentType: string | null, modality: MediaModality) {
  const normalized = contentType?.toLowerCase() ?? "";

  if (normalized.includes("png")) return "png";
  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("mp4")) return "mp4";

  if (modality === "image") return "png";
  if (modality === "audio") return "wav";
  return "mp4";
}

export async function generateMediaWithHuggingFace({
  token,
  modality,
  model,
  prompt,
  provider,
}: HuggingFaceGenerationRequest) {
  const client = new InferenceClient(token);
  const resolvedProvider = provider && provider !== "huggingface" ? provider : undefined;
  const args = resolvedProvider
    ? {
        model,
        inputs: prompt,
        provider: resolvedProvider as any,
      }
    : {
        model,
        inputs: prompt,
      };

  let blob: Blob;

  if (modality === "image") {
    blob = (await client.textToImage(args)) as unknown as Blob;
  } else if (modality === "audio") {
    blob = (await client.textToSpeech(args)) as unknown as Blob;
  } else {
    blob = (await client.textToVideo(args)) as unknown as Blob;
  }

  return {
    blob,
    contentType: blob.type || null,
    extension: getFileExtension(blob.type || null, modality),
  };
}
