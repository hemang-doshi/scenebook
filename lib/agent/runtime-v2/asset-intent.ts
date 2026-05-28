import type { ProjectWorkspace } from "@/lib/data/repository";

export const runtimeAssetModalities = ["image", "video", "audio"] as const;

export type RuntimeAssetModality = (typeof runtimeAssetModalities)[number];
export type RuntimeAssetAspectRatio = "9:16" | "16:9" | "1:1";

export function isAssetGenerationRequest(rawMessage: string) {
  const message = rawMessage.trim();
  const hasDirectAssetVerb = /\b(generate|create|make|draft|produce|build|render)\b/i.test(message);
  const hasGiveAssetVerb = /\b(give me|give us)\b/i.test(message);
  const hasAssetNoun = /\b(asset|image|photo|picture|still|poster|thumbnail|thumb|video|clip|b-roll|b roll|audio|voiceover|voice-over|narration|soundtrack|prompt json|prompt)\b/i.test(message);

  if (/\b(ideas|options|brainstorm|suggest)\b/i.test(message) && !hasDirectAssetVerb) {
    return false;
  }

  return (hasDirectAssetVerb || hasGiveAssetVerb) && hasAssetNoun;
}

export function inferAssetModality(rawMessage: string): RuntimeAssetModality | null {
  const message = rawMessage.toLowerCase();

  if (/\b(audio|voiceover|voice-over|voice over|narration|narrator|soundtrack|tts|voice)\b/.test(message)) {
    return "audio";
  }

  if (/\b(video|clip|b-roll|b roll|motion|moving shot|roll footage)\b/.test(message)) {
    return "video";
  }

  if (/\b(image|photo|picture|still|poster|thumbnail|thumb|key art|cover)\b/.test(message)) {
    return "image";
  }

  return null;
}

export function inferAssetAspectRatio(
  rawMessage: string,
  project?: ProjectWorkspace | null,
): RuntimeAssetAspectRatio {
  const message = rawMessage.toLowerCase();

  if (/\b16\s*:\s*9\b/.test(message) || /\b(horizontal|landscape|youtube video)\b/.test(message)) {
    return "16:9";
  }

  if (/\b1\s*:\s*1\b/.test(message) || /\b(square|feed post|carousel)\b/.test(message)) {
    return "1:1";
  }

  if (
    /\b9\s*:\s*16\b/.test(message) ||
    /\b(vertical|reel|tiktok|shorts|youtube shorts|instagram reel|ig reel)\b/.test(message)
  ) {
    return "9:16";
  }

  if (project?.format === "reel" || project?.format === "short" || project?.format === "tiktok") {
    return "9:16";
  }

  if (project?.platform === "tiktok") {
    return "9:16";
  }

  if (project?.platform === "instagram" && project?.format !== "carousel" && project?.format !== "post") {
    return "9:16";
  }

  if (project?.format === "carousel" || project?.format === "post") {
    return "1:1";
  }

  if (project?.platform === "youtube") {
    return "16:9";
  }

  return "9:16";
}

export function inferAssetFolderPath(rawMessage: string, modality: RuntimeAssetModality) {
  const message = rawMessage.toLowerCase();

  if (/\b(thumbnail|thumb|cover)\b/.test(message)) {
    return "Thumbnails";
  }

  if (/\b(b-roll|b roll|roll footage)\b/.test(message)) {
    return "B-roll";
  }

  if (modality === "audio") {
    return "Generated / Audio";
  }

  if (modality === "video") {
    return "Generated / Videos";
  }

  return "Generated / Images";
}

export function inferAssetTitle(rawMessage: string, modality: RuntimeAssetModality) {
  const message = rawMessage.toLowerCase();

  if (/\b(thumbnail|thumb|cover)\b/.test(message)) {
    return "Generated thumbnail";
  }

  if (/\b(b-roll|b roll|roll footage)\b/.test(message)) {
    return "Generated B-roll";
  }

  if (/\b(voiceover|voice-over|voice over|narration)\b/.test(message)) {
    return "Generated voiceover";
  }

  return `Generated ${modality}`;
}

export function hasSpecificAssetDirection(rawMessage: string) {
  const cleaned = rawMessage
    .replace(/\b(generate|create|make|draft|produce|build|render|give me|give us|please)\b/gi, " ")
    .replace(/\b(an?|the|some|asset|image|photo|picture|still|poster|thumbnail|thumb|video|clip|b-roll|b roll|audio|voiceover|voice-over|narration|soundtrack|prompt json|prompt)\b/gi, " ")
    .replace(/\b(for|of|to|me|us|this|that)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  return words.length >= 2 || cleaned.length >= 14;
}

export function defaultNegativePrompt(modality: RuntimeAssetModality) {
  if (modality === "audio") {
    return "background noise, clipped audio, long silence, robotic glitches";
  }

  if (modality === "video") {
    return "blurry motion, distorted anatomy, unreadable text, watermark, logo artifacts";
  }

  return "blurry, distorted anatomy, unreadable text, watermark, logo artifacts";
}
