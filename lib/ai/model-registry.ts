const defaultNimChatModelId =
  process.env.NVIDIA_NIM_MODEL?.trim() || "nvidia/nemotron-3-super-120b-a12b";

type ModelPresetBase = {
  id: string;
  label: string;
  provider?: string;
  recommended?: boolean;
};

export type ChatModelPreset = ModelPresetBase & {
  provider: "nim" | "openrouter" | "gemini";
};

export const chatModelPresets: ChatModelPreset[] = [
  {
    id: defaultNimChatModelId,
    label: "Nemotron 3 Super via NIM",
    provider: "nim",
    recommended: true,
  },
  {
    id: "deepseek-ai/deepseek-v4-pro",
    label: "DeepSeek V4 Pro via NIM",
    provider: "nim",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash via OpenRouter",
    provider: "openrouter",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
  },
];

export const textModelPresets = chatModelPresets;

export const mediaModalities = ["image", "video", "audio"] as const;

export type MediaModality = (typeof mediaModalities)[number];

export type MediaModelPreset = ModelPresetBase & {
  modality: MediaModality;
  description: string;
};

export const imageModelPresets: MediaModelPreset[] = [
  {
    id: "black-forest-labs/FLUX.1-Krea-dev",
    label: "FLUX.1 Krea Dev",
    modality: "image",
    description: "Higher-fidelity concept stills.",
  },
  {
    id: "Qwen/Qwen-Image",
    label: "Qwen Image",
    modality: "image",
    description: "General image ideation and composition.",
  },
  {
    id: "ByteDance/Hyper-SD",
    label: "Hyper-SD",
    modality: "image",
    description: "Fast visual drafts and variations.",
  },
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
];

export const videoModelPresets: MediaModelPreset[] = [
  {
    id: "tencent/HunyuanVideo",
    label: "HunyuanVideo",
    modality: "video",
    description: "General text-to-video concept clips.",
  },
  {
    id: "Lightricks/LTX-Video-0.9.8-13B-distilled",
    label: "LTX Video Distilled",
    modality: "video",
    description: "Faster stylized motion studies.",
  },
  {
    id: "Wan-AI/Wan2.2-TI2V-5B",
    label: "Wan 2.2 TI2V",
    modality: "video",
    description: "Prompted motion with stronger visual grounding.",
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

export const audioModelPresets: MediaModelPreset[] = [
  {
    id: "hexgrad/Kokoro-82M",
    label: "Kokoro 82M",
    modality: "audio",
    description: "Cleaner synthetic narration.",
  },
  {
    id: "OuteAI/OuteTTS-0.3-500M",
    label: "OuteTTS 0.3 500M",
    modality: "audio",
    description: "Draft narration and voiceover generation.",
  },
  {
    id: "facebook/mms-tts-eng",
    label: "MMS TTS English",
    modality: "audio",
    description: "Voiceover draft audio.",
  },
];

export const mediaModelPresets: MediaModelPreset[] = [
  ...imageModelPresets,
  ...videoModelPresets,
  ...audioModelPresets,
];

export function getChatModelPresets() {
  return chatModelPresets;
}

export function getMediaModelPresets(modality: MediaModality) {
  if (modality === "image") return imageModelPresets;
  if (modality === "video") return videoModelPresets;
  return audioModelPresets;
}

export function getDefaultChatModel() {
  const match = chatModelPresets.find((preset) => preset.recommended) ?? chatModelPresets[0];

  if (!match) {
    throw new Error("No default chat model configured.");
  }

  return match;
}

export function getDefaultMediaModel(modality: MediaModality) {
  const match = getMediaModelPresets(modality)[0];

  if (!match) {
    throw new Error(`No default model configured for ${modality}.`);
  }

  return match;
}

export function getModelById(id: string) {
  return [...chatModelPresets, ...mediaModelPresets].find((model) => model.id === id);
}

export function getModelsForAccordion() {
  return {
    chat: chatModelPresets,
    image: imageModelPresets,
    video: videoModelPresets,
    audio: audioModelPresets,
  };
}
