export const textModelPresets = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash via OpenRouter", provider: "openrouter" },
  { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B via NIM", provider: "nim" },
] as const;

export const mediaModalities = ["image", "audio", "video"] as const;

export type MediaModality = (typeof mediaModalities)[number];

export type MediaModelPreset = {
  id: string;
  label: string;
  provider?: string;
  modality: MediaModality;
  description: string;
};

export const mediaModelPresets: MediaModelPreset[] = [
  {
    id: "black-forest-labs/FLUX.1-schnell",
    label: "FLUX.1 Schnell",
    provider: "fal-ai",
    modality: "image",
    description: "Fast visual concept stills.",
  },
  {
    id: "black-forest-labs/FLUX.1-dev",
    label: "FLUX.1 Dev",
    provider: "replicate",
    modality: "image",
    description: "Higher-quality image generation.",
  },
  {
    id: "facebook/mms-tts-eng",
    label: "MMS TTS English",
    modality: "audio",
    description: "Voiceover draft audio.",
  },
  {
    id: "hexgrad/Kokoro-82M",
    label: "Kokoro 82M",
    modality: "audio",
    description: "Cleaner synthetic narration.",
  },
  {
    id: "genmo/mochi-1-preview",
    label: "Mochi 1 Preview",
    provider: "replicate",
    modality: "video",
    description: "Short concept motion clips.",
  },
  {
    id: "Wan-AI/Wan2.1-T2V-1.3B",
    label: "Wan 2.1 T2V",
    provider: "fal-ai",
    modality: "video",
    description: "Text-to-video motion studies.",
  },
];

export function getMediaModelPresets(modality: MediaModality) {
  return mediaModelPresets.filter((preset) => preset.modality === modality);
}

export function getDefaultMediaModel(modality: MediaModality) {
  const match = getMediaModelPresets(modality)[0];

  if (!match) {
    throw new Error(`No default model configured for ${modality}.`);
  }

  return match;
}
