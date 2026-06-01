import { runAssetWorkflow } from "@/lib/agent/runtime-v3/workflows/asset-workflow";
import { runFinalTextWorkflow } from "@/lib/agent/runtime-v3/workflows/final-text-workflow";
import { runGoalWorkflow } from "@/lib/agent/runtime-v3/workflows/goal-workflow";
import { runEditorHandoffWorkflow, runPublishWorkflow } from "@/lib/agent/runtime-v3/workflows/handoff-workflows";
import { runScriptWorkflow } from "@/lib/agent/runtime-v3/workflows/script-workflow";
import type { WorkflowResult, WorkflowRunInput } from "@/lib/agent/runtime-v3/workflows/types";
import { runWorkspaceControlWorkflow } from "@/lib/agent/runtime-v3/workflows/workspace-control-workflow";

export type { WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";

export async function runWorkflow(input: WorkflowRunInput): Promise<WorkflowResult> {
  switch (input.decision.workflowName) {
    case "script_workflow":
      return runScriptWorkflow({
        workflowInput: input.decision.input,
        context: input.context,
        snapshot: input.snapshot,
        stream: input.stream,
      });
    case "workspace_control_workflow":
      return runWorkspaceControlWorkflow({
        workflowInput: input.decision.input,
        context: input.context,
        snapshot: input.snapshot,
        stream: input.stream,
      });
    case "asset_workflow":
      return runAssetWorkflow({
        workflowInput: input.decision.input,
        context: input.context,
        snapshot: input.snapshot,
        stream: input.stream,
      });
    case "goal_workflow":
      return runGoalWorkflow(input);
    case "editor_handoff_workflow":
      return runEditorHandoffWorkflow({
        workflowInput: input.decision.input,
        context: input.context,
        snapshot: input.snapshot,
        stream: input.stream,
      });
    case "publish_workflow":
      return runPublishWorkflow({
        workflowInput: input.decision.input,
        context: input.context,
        snapshot: input.snapshot,
        stream: input.stream,
      });
    default:
      return runFinalTextWorkflow(input);
  }
}
