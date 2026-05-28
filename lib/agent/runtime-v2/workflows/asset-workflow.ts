import type { AgentWorkflow } from "@/lib/agent/runtime-v2/workflows/types";

export const assetGenerationWorkflow: AgentWorkflow = {
  name: "asset_generation",
  description: "Converts creative direction into structured prompt JSON, generates media, and attaches the asset to the project.",
  stages: ["brief_check", "prompt_json", "media_generation", "project_attachment"],
  requiredCreativeFields: ["modality", "promptOrCreativeDirection", "projectFormat"],
  optionalCreativeFields: ["aspectRatio", "visualStyle", "folderIntent"],
  defaultToolSequence: [
    "generate_prompt_json",
    "generate_media_asset",
    "attach_asset_to_project",
  ],
  questionStrategy: {
    maxQuestions: 3,
    questionsByField: {
      modality: "What kind of asset should be generated: image, video, or audio?",
      promptOrCreativeDirection: "What should the asset show, sound like, or communicate?",
      projectFormat: "What project or platform format should the asset fit?",
      aspectRatio: "What aspect ratio should the asset use?",
      visualStyle: "What visual style should guide the generated asset?",
      folderIntent: "Where should this asset be organized after generation?",
    },
  },
};
