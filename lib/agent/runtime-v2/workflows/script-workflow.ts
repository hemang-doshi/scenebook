import type { AgentWorkflow } from "@/lib/agent/runtime-v2/workflows/types";

export const scriptWorkflow: AgentWorkflow = {
  name: "script",
  description: "Turns a resolved creative brief into a drafted, critiqued, and workspace-ready script package.",
  stages: ["brief_check", "draft", "critique", "workspace_update", "artifact_capture", "status_update"],
  requiredCreativeFields: ["coreAngle", "platform", "durationSeconds", "format", "tone"],
  optionalCreativeFields: ["viewerEmotion", "cta", "targetAudience", "visualStyle"],
  defaultToolSequence: [
    "generate_script_package",
    "critique_script",
    "update_script_lab",
    "create_project_artifact",
    "update_project_status",
  ],
  questionStrategy: {
    maxQuestions: 3,
    questionsByField: {
      coreAngle: "What is the specific angle or promise this script should make clear in the first few seconds?",
      platform: "Which platform should this be optimized for?",
      durationSeconds: "How long should the finished script be?",
      format: "What format should the script assume, such as talking head, montage, product demo, or screen recording?",
      tone: "What tone should the script use?",
      viewerEmotion: "What should viewers feel after watching this?",
      cta: "What action should the viewer take at the end?",
      targetAudience: "Who is this script primarily for?",
      visualStyle: "What visual style should the script support?",
    },
  },
};
