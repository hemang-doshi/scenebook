import { generateText } from "@/lib/ai/client";
import type { WorkflowRunInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";

export async function runFinalTextWorkflow(input: WorkflowRunInput): Promise<WorkflowResult> {
  const response = await generateText({
    prompt: input.context.rawInput,
    systemInstruction: "Give concise, project-aware SceneBook creative guidance. Do not claim workspace mutations.",
    modelOverride: input.context.selectedModels?.chat,
  });

  return {
    observations: [],
    finalResponse: response,
  };
}
