import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import type { WorkflowHandlerInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";

function request(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null && "request" in input.workflowInput
    ? String((input.workflowInput as { request?: unknown }).request ?? input.context.rawInput)
    : input.context.rawInput;
}

export async function runEditorHandoffWorkflow(input: WorkflowHandlerInput): Promise<WorkflowResult> {
  const observation = await executeRuntimeV3Tool({
    toolName: "prepare_editor_handoff",
    rawInput: { request: request(input) },
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });

  return {
    observations: [observation],
    finalResponse: observation.status === "completed"
      ? "Editor handoff prepared. Timeline editing is not wired yet, so I did not mutate the editor."
      : `Editor handoff failed: ${observation.message}`,
  };
}

export async function runPublishWorkflow(input: WorkflowHandlerInput): Promise<WorkflowResult> {
  const packageObservation = await executeRuntimeV3Tool({
    toolName: "prepare_instagram_package",
    rawInput: { request: request(input) },
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });

  if (packageObservation.status !== "completed") {
    return {
      observations: [packageObservation],
      finalResponse: `Publish preparation failed: ${packageObservation.message}`,
    };
  }

  const publishObservation = await executeRuntimeV3Tool({
    toolName: "publish_to_instagram",
    rawInput: { request: request(input) },
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });

  return {
    observations: [packageObservation, publishObservation],
    finalResponse:
      publishObservation.status === "awaiting_approval"
        ? `Instagram package prepared, but approval is required before publishing: ${publishObservation.message}`
        : publishObservation.status === "completed"
          ? "Instagram package prepared and publish execution completed."
          : `Instagram package prepared, but publishing is blocked: ${publishObservation.message}. Nothing was published.`,
  };
}
