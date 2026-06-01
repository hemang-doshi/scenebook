import { ZodError } from "zod";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import type { SceneBookGraphState } from "@/lib/agent/runtime-v4/graph/state";
import { compactProjectMindForModel } from "@/lib/agent/runtime-v4/memory/project-mind";
import type { ProjectMindSnapshot } from "@/lib/agent/runtime-v4/memory/memory-types";
import type {
  GraphPatchExecutionResult,
  PatchExecutionContext,
} from "@/lib/agent/runtime-v4/patch/patch-results";
import { projectPatchExecutionResultToObservation } from "@/lib/agent/runtime-v4/patch/patch-results";
import type { ProjectPatch, ProjectPatchOperationType } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";
import { getRuntimeV4Workflow } from "@/lib/agent/runtime-v4/workflows/workflow-registry";
import type {
  CreativeWorkflowResult,
  RuntimeV4WorkflowName,
} from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

export type WorkflowPatchExecutor = {
  apply(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
  }): Promise<GraphPatchExecutionResult> | GraphPatchExecutionResult;
};

export type WorkflowExecutionInput = {
  workflowName: string;
  input: unknown;
  state?: SceneBookGraphState;
  context: PatchExecutionContext;
  projectMind?: ProjectMindSnapshot;
  modelGateway?: ModelGateway;
  applyPatch?: boolean;
};

export type WorkflowExecutionResult = {
  workflowResult: CreativeWorkflowResult;
  observation: ToolObservation;
  events: RuntimeV4Event[];
  patchResult?: GraphPatchExecutionResult;
};

export type WorkflowExecutorOptions = {
  modelGateway?: ModelGateway;
  patchExecutor?: WorkflowPatchExecutor;
  applyPatch?: boolean;
};

function eventBase(input: WorkflowExecutionInput) {
  return {
    runId: input.context.runId,
    threadId: input.context.threadId ?? null,
  };
}

function completedObservation(result: Extract<CreativeWorkflowResult, { status: "completed" }>): ToolObservation {
  return {
    toolName: result.workflowName,
    status: "completed",
    message: result.response,
    output: toJsonObject({
      kind: "creative_workflow",
      workflowName: result.workflowName,
      artifacts: result.artifacts ?? [],
      patchPlanned: Boolean(result.patch),
    }),
  };
}

const workspaceSafeOperationTypes = new Set<ProjectPatchOperationType>([
  "update_creative_brief",
  "update_active_goal",
  "create_script_version",
  "update_script_lab",
  "update_shoot_pack",
  "create_project_artifact",
  "record_project_memory",
]);

const maxAutoApplyOperations = 8;

function workflowPatchAutoApplyDecision(patch: ProjectPatch) {
  if (patch.riskLevel !== "low") {
    return { allowed: false, reason: `Patch risk level is ${patch.riskLevel}.` };
  }

  if (patch.requiresApproval) {
    return { allowed: false, reason: "Patch requires approval." };
  }

  if (patch.operations.length > maxAutoApplyOperations) {
    return { allowed: false, reason: `Patch has ${patch.operations.length} operations; auto-apply limit is ${maxAutoApplyOperations}.` };
  }

  const unsafeOperation = patch.operations.find((operation) =>
    !workspaceSafeOperationTypes.has(operation.type) || operation.requiresApproval,
  );
  if (unsafeOperation) {
    return { allowed: false, reason: `Patch contains unsafe or approval-gated operation ${unsafeOperation.type}.` };
  }

  const serialized = JSON.stringify(patch).toLowerCase();
  if (/\b(delete|destructive|nango)\b/.test(serialized) || /"externalpublish"\s*:\s*true/.test(serialized)) {
    return { allowed: false, reason: "Patch appears to include external, publish, or destructive intent." };
  }

  return { allowed: true, reason: "Patch is low-risk and workspace-only." };
}

function resultToObservation(result: CreativeWorkflowResult): ToolObservation {
  if (result.status === "completed") {
    return completedObservation(result);
  }

  if (result.status === "needs_input") {
    return {
      toolName: result.workflowName,
      status: "blocked",
      message: result.reason,
      output: toJsonObject({
        kind: "creative_workflow_needs_input",
        workflowName: result.workflowName,
        questions: result.questions,
      }),
    };
  }

  return {
    toolName: result.workflowName,
    status: result.error.recoverable ? "blocked" : "failed",
    message: result.error.message,
    output: toJsonObject({
      kind: "creative_workflow_failed",
      workflowName: result.workflowName,
      error: result.error,
    }),
  };
}

function failedResult(
  workflowName: RuntimeV4WorkflowName,
  code: string,
  caught: unknown,
): CreativeWorkflowResult {
  const message = caught instanceof ZodError
    ? caught.message
    : caught instanceof Error
      ? caught.message
      : String(caught);

  return {
    status: "failed",
    workflowName,
    error: {
      code,
      message,
      recoverable: true,
    },
  };
}

export class WorkflowExecutor {
  private readonly modelGateway?: ModelGateway;
  private readonly patchExecutor?: WorkflowPatchExecutor;
  private readonly applyPatch: boolean;

  constructor(options: WorkflowExecutorOptions = {}) {
    this.modelGateway = options.modelGateway;
    this.patchExecutor = options.patchExecutor;
    this.applyPatch = options.applyPatch ?? true;
  }

  async execute(input: WorkflowExecutionInput): Promise<WorkflowExecutionResult> {
    const workflowName = input.workflowName as RuntimeV4WorkflowName;
    const workflow = getRuntimeV4Workflow(workflowName);
    const events: RuntimeV4Event[] = [{
      type: "workflow_started",
      ...eventBase(input),
      workflowName,
      message: `Running workflow ${input.workflowName}.`,
    }];

    if (!workflow) {
      const workflowResult = failedResult(
        workflowName,
        "WORKFLOW_NOT_FOUND",
        new Error(`Unknown runtime-v4 workflow: ${input.workflowName}`),
      );
      const observation = resultToObservation(workflowResult);
      events.push({
        type: "workflow_failed",
        ...eventBase(input),
        workflowName,
        observation,
        error: observation.message,
      });
      return { workflowResult, observation, events };
    }

    const projectMind = input.projectMind ?? input.state?.projectMind;
    if (!projectMind) {
      const workflowResult = failedResult(workflow.name, "PROJECT_MIND_MISSING", new Error("ProjectMind is required to execute workflows."));
      const observation = resultToObservation(workflowResult);
      events.push({
        type: "workflow_failed",
        ...eventBase(input),
        workflowName: workflow.name,
        observation,
        error: observation.message,
      });
      return { workflowResult, observation, events };
    }

    let workflowResult: CreativeWorkflowResult;
    try {
      const parsedInput = workflow.inputSchema.parse(input.input);
      workflowResult = await workflow.handler(parsedInput, {
        projectMind,
        compactProjectMind: compactProjectMindForModel(projectMind),
        modelGateway: input.modelGateway ?? this.modelGateway,
        runtimeContext: input.context,
        state: input.state,
      });
    } catch (caught) {
      workflowResult = failedResult(workflow.name, "WORKFLOW_EXECUTION_FAILED", caught);
    }

    events.push(...(workflowResult.status === "completed" ? workflowResult.events ?? [] : []));
    let observation = resultToObservation(workflowResult);
    let patchResult: GraphPatchExecutionResult | undefined;

    if (workflowResult.status === "completed" && workflowResult.patch) {
      events.push({
        type: "workflow_patch_planned",
        ...eventBase(input),
        workflowName: workflow.name,
        patch: workflowResult.patch,
        message: workflowResult.patch.summary,
      });
    }

    if (
      workflowResult.status === "completed" &&
      workflowResult.patch &&
      (input.applyPatch ?? this.applyPatch) &&
      this.patchExecutor
    ) {
      const autoApply = workflowPatchAutoApplyDecision(workflowResult.patch);
      if (autoApply.allowed) {
        patchResult = await this.patchExecutor.apply({
          patch: workflowResult.patch,
          context: input.context,
        });
        observation = projectPatchExecutionResultToObservation(patchResult);
        observation.toolName = workflow.name;
        events.push(...patchResult.events);
      } else {
        observation = {
          ...observation,
          output: toJsonObject({
            ...(observation.output ?? {}),
            patchAutoApplySkipped: true,
            patchAutoApplyReason: autoApply.reason,
            patchPlanned: true,
          }),
        };
      }
    }

    if (workflowResult.status === "completed") {
      for (const artifact of workflowResult.artifacts ?? []) {
        events.push({
          type: "workflow_artifact_created",
          ...eventBase(input),
          workflowName: workflow.name,
          message: artifact.title,
        });
      }
      events.push({
        type: "workflow_completed",
        ...eventBase(input),
        workflowName: workflow.name,
        observation,
        message: observation.message,
      });
    } else if (workflowResult.status === "needs_input") {
      events.push({
        type: "workflow_needs_input",
        ...eventBase(input),
        workflowName: workflow.name,
        observation,
        message: workflowResult.reason,
      });
    } else {
      events.push({
        type: "workflow_failed",
        ...eventBase(input),
        workflowName: workflow.name,
        observation,
        error: workflowResult.error.message,
      });
    }

    return {
      workflowResult,
      observation,
      events,
      patchResult,
    };
  }
}
