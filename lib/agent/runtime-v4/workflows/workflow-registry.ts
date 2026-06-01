import { assetPromptPackWorkflow } from "@/lib/agent/runtime-v4/workflows/asset-prompt-pack-workflow";
import { planReelWorkflow } from "@/lib/agent/runtime-v4/workflows/plan-reel-workflow";
import { productionPackageWorkflow } from "@/lib/agent/runtime-v4/workflows/production-package-workflow";
import { publishPrepWorkflow } from "@/lib/agent/runtime-v4/workflows/publish-prep-workflow";
import { reviewWorkflow } from "@/lib/agent/runtime-v4/workflows/review-workflow";
import { scriptPackageWorkflow } from "@/lib/agent/runtime-v4/workflows/script-package-workflow";
import { shootPackWorkflow } from "@/lib/agent/runtime-v4/workflows/shoot-pack-workflow";
import type {
  CreativeWorkflow,
  RuntimeV4WorkflowName,
} from "@/lib/agent/runtime-v4/workflows/types";

export const runtimeV4Workflows = [
  planReelWorkflow,
  scriptPackageWorkflow,
  shootPackWorkflow,
  assetPromptPackWorkflow,
  reviewWorkflow,
  publishPrepWorkflow,
  productionPackageWorkflow,
] as const satisfies CreativeWorkflow[];

const registry = new Map<RuntimeV4WorkflowName, CreativeWorkflow>(
  runtimeV4Workflows.map((workflow) => [workflow.name, workflow]),
);

export function getRuntimeV4Workflow(name: RuntimeV4WorkflowName) {
  return registry.get(name);
}

export function listRuntimeV4Workflows() {
  return [...runtimeV4Workflows];
}
