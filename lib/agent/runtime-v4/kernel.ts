import {
  appendAgentMessage,
  completeAgentRun,
  createAgentRun,
  createOrLoadThread,
  failAgentRun,
} from "@/lib/agent/runtime";
import { createAgentSseResponse } from "@/lib/agent/runtime-v3/stream";
import { runWorkflow } from "@/lib/agent/runtime-v3/workflows";
import type {
  AgentDecision as RuntimeV3AgentDecision,
  AgentRunRequest,
  ToolObservation,
} from "@/lib/agent/runtime-v3/types";
import { decideNextStep } from "@/lib/agent/runtime-v4/decision/decision-engine";
import { checkGoalProgress } from "@/lib/agent/runtime-v4/decision/goal-checker";
import type { AgentDecision, GoalCheck } from "@/lib/agent/runtime-v4/decision/schemas";
import { mapRuntimeV4EventToLegacy, type RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import { runSceneBookGraph } from "@/lib/agent/runtime-v4/graph/scenebook-graph";
import { buildProjectContext } from "@/lib/agent/runtime-v4/context/context-builder";
import {
  buildRunSummaryFromObservations,
  saveRunSummary,
} from "@/lib/agent/runtime-v4/memory/run-summary-store";
import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";
import {
  PatchExecutor,
  SupabasePatchAuditStore,
} from "@/lib/agent/runtime-v4/patch/patch-executor";
import { projectPatchExecutionResultToObservation } from "@/lib/agent/runtime-v4/patch/patch-results";
import { toolVerificationEvent } from "@/lib/agent/runtime-v4/patch/patch-verifier";
import { ToolExecutor } from "@/lib/agent/runtime-v4/tools/executor";
import { toolExecutionResultToObservation } from "@/lib/agent/runtime-v4/tools/tool-results";
import {
  createRuntimeV4ToolRegistry,
  summarizeRuntimeV4Tools,
} from "@/lib/agent/runtime-v4/tools/registry";
import type { JsonValue } from "@/lib/types";

function responseForQuestions(decision: Extract<AgentDecision, { type: "ask_question" }>) {
  return [
    "I need a little more context before I change the workspace:",
    ...decision.questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

function responseForPlan(decision: Extract<AgentDecision, { type: "propose_plan" }>) {
  return [
    decision.plan.title,
    ...decision.plan.steps.map((step, index) => `${index + 1}. ${step.label}`),
  ].join("\n");
}

function responseForGoalQuestions(progress: Extract<GoalCheck, { status: "ask_user" }>) {
  return [
    "I need one thing before I continue:",
    ...progress.questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

function asRuntimeV3WorkflowDecision(decision: Extract<AgentDecision, { type: "workflow_call" }>) {
  return decision as Extract<RuntimeV3AgentDecision, { type: "workflow_call" }>;
}

export type AgentOrchestrator = "custom" | "langgraph";

export function resolveAgentOrchestrator(value = process.env.AGENT_ORCHESTRATOR): AgentOrchestrator {
  return value === "langgraph" ? "langgraph" : "custom";
}

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
}

function createRuntimeV4Execution() {
  const patchAuditStore = new SupabasePatchAuditStore();
  const toolExecutor = new ToolExecutor({
    registry: createRuntimeV4ToolRegistry(),
  });
  const patchExecutor = new PatchExecutor({
    toolExecutor,
    auditStore: patchAuditStore,
  });

  return {
    toolExecutor,
    patchExecutor,
    plannedPatchStore: patchAuditStore,
  };
}

function runLangGraphRuntime(request: AgentRunRequest) {
  return createAgentSseResponse(async (stream) => {
    let runId: string | null = null;

    try {
      const thread = await createOrLoadThread(request.projectId, request.threadId);
      await appendAgentMessage({
        projectId: request.projectId,
        threadId: thread.id,
        role: "user",
        content: request.message,
        model: request.selectedModels?.chat ?? null,
        metadata: request.attachments ? { attachments: request.attachments } : {},
      });

      const run = await createAgentRun({
        projectId: request.projectId,
        threadId: thread.id,
        input: request.message,
        selectedModels: request.selectedModels,
        metadata: {
          runtime: "v4",
          orchestrator: "langgraph",
        },
      });
      runId = run.id;

      stream.emitLegacyMeta({
        threadId: thread.id,
        runId: run.id,
      });

      const runtimeV4Execution = createRuntimeV4Execution();
      const graphState = await runSceneBookGraph({
        projectId: request.projectId,
        threadId: thread.id,
        userId: request.userId,
        runId: run.id,
        goal: request.message,
        messages: [{ role: "user", content: request.message }],
        model: request.selectedModels?.chat,
        toolSummaries: summarizeRuntimeV4Tools(),
        toolExecutor: runtimeV4Execution.toolExecutor,
        patchExecutor: runtimeV4Execution.patchExecutor,
        plannedPatchStore: runtimeV4Execution.plannedPatchStore,
      });

      for (const event of graphState.events) {
        for (const legacyEvent of mapRuntimeV4EventToLegacy(event)) {
          stream.emit(legacyEvent.type, legacyEvent.payload);
        }
      }

      const finalResponse = graphState.finalResponse
        ?? "I loaded the project context, but the LangGraph runtime did not produce a final response.";
      const runSummaryInput = buildRunSummaryFromObservations({
        projectId: request.projectId,
        threadId: thread.id,
        runId: run.id,
        userGoal: request.message,
        observations: graphState.toolResults ?? [],
        finalResponse,
      });
      const runSummary = runSummaryInput
        ? await saveRunSummary(runSummaryInput).catch(() => null)
        : null;

      await appendAgentMessage({
        projectId: request.projectId,
        threadId: thread.id,
        role: "assistant",
        content: finalResponse,
        model: request.selectedModels?.chat ?? null,
        provider: "agent-runtime-v4",
        metadata: {
          orchestrator: "langgraph",
          stopReason: graphState.stopReason ?? null,
          graphStepCount: graphState.stepCount ?? 0,
        },
      });
      await completeAgentRun(run.id, {
        runtime: "v4",
        orchestrator: "langgraph",
        graphStopReason: graphState.stopReason ?? null,
        graphStepCount: graphState.stepCount ?? 0,
        graphTrace: jsonSafe({
          observations: graphState.observations ?? [],
          events: graphState.events ?? [],
          errors: graphState.errors ?? [],
        }),
        waitingForUser: graphState.stopReason === "ask_question" || graphState.stopReason === "approval_required",
        runSummaryId: runSummary?.id ?? null,
        runSummarySaved: Boolean(runSummary),
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Agent run failed.";
      if (runId) {
        await failAgentRun(runId, message, { runtime: "v4", orchestrator: "langgraph" }).catch(() => null);
      }
      stream.emit("run_failed", {
        error: message,
      });
    }
  });
}

export class AgentKernel {
  static run(request: AgentRunRequest) {
    if (resolveAgentOrchestrator() === "langgraph") {
      return runLangGraphRuntime(request);
    }

    return createAgentSseResponse(async (stream) => {
      let runId: string | null = null;

      try {
        const thread = await createOrLoadThread(request.projectId, request.threadId);
        await appendAgentMessage({
          projectId: request.projectId,
          threadId: thread.id,
          role: "user",
          content: request.message,
          model: request.selectedModels?.chat ?? null,
          metadata: request.attachments ? { attachments: request.attachments } : {},
        });

        const run = await createAgentRun({
          projectId: request.projectId,
          threadId: thread.id,
          input: request.message,
          selectedModels: request.selectedModels,
          metadata: {
            runtime: "v4",
          },
        });
        runId = run.id;

        stream.emit("run_started", {
          threadId: thread.id,
          runId: run.id,
        });
        stream.emitLegacyMeta({
          threadId: thread.id,
          runId: run.id,
        });

        const modelGateway = createRuntimeV4ModelGateway({
          model: request.selectedModels?.chat,
        });
        const runtimeV4Execution = createRuntimeV4Execution();
        const previousObservations: ToolObservation[] = [];
        const toolSummaries = summarizeRuntimeV4Tools();

        const finish = async (response: string, metadata: Record<string, JsonValue>, waitingForUser = false) => {
          const runSummaryInput = buildRunSummaryFromObservations({
            projectId: request.projectId,
            threadId: thread.id,
            runId: run.id,
            userGoal: request.message,
            observations: previousObservations,
            finalResponse: response,
          });
          const runSummary = runSummaryInput
            ? await saveRunSummary(runSummaryInput).catch(() => null)
            : null;

          await appendAgentMessage({
            projectId: request.projectId,
            threadId: thread.id,
            role: "assistant",
            content: response,
            model: request.selectedModels?.chat ?? null,
            provider: "agent-runtime-v4",
            metadata,
          });
          await completeAgentRun(run.id, {
            runtime: "v4",
            ...metadata,
            waitingForUser,
            runSummaryId: runSummary?.id ?? null,
            runSummarySaved: Boolean(runSummary),
          });
          stream.emit("message_delta", { text: response });
          stream.emit("run_completed", {
            threadId: thread.id,
            runId: run.id,
            waitingForUser,
          });
        };

        for (let step = 0; step < 8; step += 1) {
          const projectContext = await buildProjectContext({
            projectId: request.projectId,
            threadId: thread.id,
          });
          const snapshot = projectContext.snapshot;
          const compactSnapshot = projectContext.compactContext;

          stream.emit("snapshot_loaded", {
            snapshot: compactSnapshot,
          });

          const decision = await decideNextStep({
            message: request.message,
            snapshot,
            toolSummaries,
            previousObservations,
            model: request.selectedModels?.chat,
            modelGateway,
          });

          stream.emit("decision", {
            decision: JSON.parse(JSON.stringify(decision)),
          });

          if (decision.type === "final_response") {
            await finish(decision.response, {
              decisionType: decision.type,
            });
            return;
          }

          if (decision.type === "ask_question") {
            await finish(responseForQuestions(decision), {
              decisionType: decision.type,
              expectedFieldTargets: decision.expectedFieldTargets ?? [],
            }, true);
            return;
          }

          if (decision.type === "propose_plan") {
            const response = responseForPlan(decision);
            stream.emit("plan", {
              plan: JSON.parse(JSON.stringify(decision.plan)),
            });
            await finish(response, {
              decisionType: decision.type,
            });
            return;
          }

          const context = {
            projectId: request.projectId,
            threadId: thread.id,
            runId: run.id,
            userId: request.userId,
            source: "agent",
            rawInput: request.message,
            snapshot,
            selectedModels: request.selectedModels,
          };

          let newObservations: ToolObservation[] = [];
          let workflowFinalResponse: string | undefined;

          if (decision.type === "tool_call") {
            const toolResult = await runtimeV4Execution.toolExecutor.execute({
              toolName: decision.toolName,
              input: decision.input,
              context: {
                userId: request.userId,
                projectId: request.projectId,
                threadId: thread.id,
                runId: run.id,
                source: "agent",
                rawInput: request.message,
                selectedModels: request.selectedModels,
              },
            });
            const observation = toolExecutionResultToObservation(toolResult);
            const verificationEvent = toolVerificationEvent({
              result: toolResult,
              runId: run.id,
              threadId: thread.id,
            });
            const toolEvents: RuntimeV4Event[] = [
              ...(verificationEvent ? [verificationEvent] : []),
              {
                type: toolResult.status === "completed"
                  ? "tool_completed"
                  : toolResult.status === "awaiting_approval"
                    ? "approval_required"
                    : "tool_failed",
                runId: run.id,
                threadId: thread.id,
                toolName: toolResult.toolName,
                toolCallId: toolResult.toolCallId,
                observation,
                error: toolResult.status === "completed" ? undefined : observation.message,
              },
            ];
            for (const event of toolEvents) {
              for (const legacyEvent of mapRuntimeV4EventToLegacy(event)) {
                stream.emit(legacyEvent.type, legacyEvent.payload);
              }
            }
            newObservations = [observation];
          }

          if (decision.type === "project_patch") {
            const patchResult = await runtimeV4Execution.patchExecutor.apply({
              patch: decision.patch,
              context: {
                userId: request.userId,
                projectId: request.projectId,
                threadId: thread.id,
                runId: run.id,
                source: "agent",
                rawInput: request.message,
                selectedModels: request.selectedModels,
              },
            });
            for (const event of patchResult.events) {
              for (const legacyEvent of mapRuntimeV4EventToLegacy(event)) {
                stream.emit(legacyEvent.type, legacyEvent.payload);
              }
            }
            newObservations = [projectPatchExecutionResultToObservation(patchResult)];
          }

          if (decision.type === "workflow_call") {
            const result = await runWorkflow({
              decision: asRuntimeV3WorkflowDecision(decision),
              context,
              snapshot,
              stream,
            });
            newObservations = result.observations;
            workflowFinalResponse = result.finalResponse;
          }

          if (decision.type === "stop_with_error") {
            throw new Error(decision.message);
          }

          previousObservations.push(...newObservations);
          const awaitingApproval = newObservations.find((observation) => observation.status === "awaiting_approval");
          if (awaitingApproval) {
            await finish(awaitingApproval.message, {
              decisionType: decision.type,
              goalStatus: "awaiting_approval",
            }, true);
            return;
          }

          const progress = await checkGoalProgress({
            message: request.message,
            snapshot,
            observations: newObservations,
            workflowFinalResponse,
            model: request.selectedModels?.chat,
            modelGateway,
          });

          if (progress.status === "satisfied") {
            await finish(progress.response, {
              decisionType: decision.type,
              goalStatus: progress.status,
            });
            return;
          }

          if (progress.status === "ask_user") {
            await finish(responseForGoalQuestions(progress), {
              decisionType: decision.type,
              goalStatus: progress.status,
            }, true);
            return;
          }

          if (progress.status === "stop_with_error") {
            throw new Error(progress.message);
          }
        }

        throw new Error("Agent step limit exceeded.");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Agent run failed.";
        if (runId) {
          await failAgentRun(runId, message, { runtime: "v4" }).catch(() => null);
        }
        stream.emit("run_failed", {
          error: message,
        });
      }
    });
  }
}
