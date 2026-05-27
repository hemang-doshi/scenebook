import type { ProjectWorkspace } from "@/lib/data/repository";
import type { AgentCommand } from "@/lib/agent/types";

const commandPrompts: Record<AgentCommand, string> = {
  script: "Focus on script structure, hooks, rewrites, and tighter scene beats.",
  "form-json-prompt": "Return structured prompt guidance that can be used to fill JSON-driven generation forms.",
  generate: "Focus on asset generation planning, prompt refinement, and media model selection.",
  storyboard: "Focus on scene sequencing, shot order, and storyboard-friendly descriptions.",
  tasks: "Break the work into clear production tasks and next actions.",
  instagram: "Focus on Instagram-ready captions, packaging, and posting decisions.",
  analyze: "Focus on performance analysis, learning extraction, and concrete iteration advice.",
  "import-to-editor": "Focus on preparing material for editor handoff and import sequencing.",
  export: "Focus on export setup, output packaging, and delivery decisions.",
};

export function buildAgentSystemInstruction(input: {
  project: ProjectWorkspace | null;
  command: AgentCommand | null;
}) {
  const base =
    "You are SceneBook's agent runtime. Respond with concrete, production-oriented help for the active creator project. Be concise, specific, and operational.";

  const commandInstruction = input.command ? commandPrompts[input.command] : null;
  const projectContext = input.project
    ? [
        `Project title: ${input.project.title}`,
        `Status: ${input.project.status}`,
        `Format: ${input.project.format}`,
        `Platform: ${input.project.platform}`,
        `Angle: ${input.project.scriptLab.angle || "n/a"}`,
        `Hook: ${input.project.scriptLab.hook || "n/a"}`,
      ].join("\n")
    : "Project context unavailable.";

  return [base, commandInstruction, projectContext].filter(Boolean).join("\n\n");
}
