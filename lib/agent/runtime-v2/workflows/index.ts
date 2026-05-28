import { assetGenerationWorkflow } from "@/lib/agent/runtime-v2/workflows/asset-workflow";
import { scriptWorkflow } from "@/lib/agent/runtime-v2/workflows/script-workflow";
import type { AgentWorkflow } from "@/lib/agent/runtime-v2/workflows/types";

export { assetGenerationWorkflow } from "@/lib/agent/runtime-v2/workflows/asset-workflow";
export { scriptWorkflow } from "@/lib/agent/runtime-v2/workflows/script-workflow";
export type { AgentWorkflow, AgentWorkflowQuestionStrategy } from "@/lib/agent/runtime-v2/workflows/types";

export const agentWorkflows = [
  scriptWorkflow,
  assetGenerationWorkflow,
] satisfies AgentWorkflow[];

const workflowMap = new Map(agentWorkflows.map((workflow) => [workflow.name, workflow]));

export function getWorkflowByName(name: string | null | undefined): AgentWorkflow | null {
  if (!name) {
    return null;
  }

  return workflowMap.get(name) ?? null;
}
