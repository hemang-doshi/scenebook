import {
  appendAgentMessage,
  completeAgentRun,
  createAgentRun,
  createOrLoadThread,
  failAgentRun,
} from "@/lib/agent/runtime";
import { createAgentSseResponse, type AgentStream } from "@/lib/agent/runtime-v3/stream";
import type {
  AgentRunRequest,
  ToolObservation,
} from "@/lib/agent/runtime-v3/types";
import type { ModelGateway } from "@/lib/ai/model-gateway";
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
import { WorkflowExecutor } from "@/lib/agent/runtime-v4/workflows/workflow-executor";
import type { JsonValue } from "@/lib/types";
import type { ProjectSnapshot } from "@/lib/agent/runtime-v3/types";

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

function isLowConfidenceFallback(decision: AgentDecision) {
  return decision.type === "final_response"
    && decision.confidence <= 0.35
    && /^I can still help\b/i.test(decision.response);
}

function createNoWritePlanDecision(snapshot: ProjectSnapshot, message: string): Extract<AgentDecision, { type: "propose_plan" }> {
  const topic = message.trim() || snapshot.project.title || "this project";
  const format = snapshot.project.format || "short-form video";
  const platform = snapshot.project.platform || "the target platform";

  return {
    type: "propose_plan",
    plan: {
      title: `Plan a ${format} about ${topic}`,
      steps: [
        { label: `Anchor the ${format} in one specific story angle.`, sideEffect: "none", requiresApproval: false },
        { label: "Draft the hook, three-beat outline, and payoff before making workspace edits.", sideEffect: "none", requiresApproval: false },
        { label: `Map A-roll, B-roll, and screen captures that make the ${platform} story concrete.`, sideEffect: "none", requiresApproval: false },
      ],
    },
    reason: "The custom runtime used deterministic no-write planning after low-confidence fallback text.",
  };
}

function maybeReplaceLowConfidenceFallback(snapshot: ProjectSnapshot, message: string, previousObservations: ToolObservation[], decision: AgentDecision) {
  if (
    isLowConfidenceFallback(decision)
    && previousObservations.length === 0
    && Boolean(snapshot.project.format)
  ) {
    return createNoWritePlanDecision(snapshot, message);
  }

  return decision;
}

export type AgentOrchestrator = "custom" | "langgraph";

export function resolveAgentOrchestrator(value = process.env.AGENT_ORCHESTRATOR): AgentOrchestrator {
  return value === "langgraph" ? "langgraph" : "custom";
}

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
}

function emitRuntimeV4Event(stream: AgentStream, event: RuntimeV4Event) {
  stream.emit("v4_event", {
    event: jsonSafe(event),
  });
  for (const legacyEvent of mapRuntimeV4EventToLegacy(event)) {
    stream.emit(legacyEvent.type, legacyEvent.payload);
  }
}

function createRuntimeV4Execution(options: { modelGateway?: ModelGateway } = {}) {
  const patchAuditStore = new SupabasePatchAuditStore();
  const toolExecutor = new ToolExecutor({
    registry: createRuntimeV4ToolRegistry(),
  });
  const patchExecutor = new PatchExecutor({
    toolExecutor,
    auditStore: patchAuditStore,
  });
  const workflowExecutor = new WorkflowExecutor({
    modelGateway: options.modelGateway,
    patchExecutor,
    plannedPatchStore: patchAuditStore,
  });

  return {
    toolExecutor,
    patchExecutor,
    plannedPatchStore: patchAuditStore,
    workflowExecutor,
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
        account: request.account,
        permissions: request.permissions,
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
        emitRuntimeV4Event(stream, event);
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
        const runtimeV4Execution = createRuntimeV4Execution({ modelGateway });
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
            commandHint: request.commandHint,
            commandInput: request.commandInput,
            snapshot,
            toolSummaries,
            previousObservations,
            model: request.selectedModels?.chat,
            modelGateway,
          });
          const resolvedDecision = maybeReplaceLowConfidenceFallback(snapshot, request.commandInput ?? request.message, previousObservations, decision);

          stream.emit("decision", {
            decision: JSON.parse(JSON.stringify(resolvedDecision)),
          });

          if (resolvedDecision.type === "final_response") {
            await finish(resolvedDecision.response, {
              decisionType: resolvedDecision.type,
            });
            return;
          }

          if (resolvedDecision.type === "ask_question") {
            await finish(responseForQuestions(resolvedDecision), {
              decisionType: resolvedDecision.type,
              expectedFieldTargets: resolvedDecision.expectedFieldTargets ?? [],
            }, true);
            return;
          }

          if (resolvedDecision.type === "propose_plan") {
            const response = responseForPlan(resolvedDecision);
            stream.emit("plan", {
              plan: JSON.parse(JSON.stringify(resolvedDecision.plan)),
            });
            await finish(response, {
              decisionType: resolvedDecision.type,
            });
            return;
          }

          let newObservations: ToolObservation[] = [];
          let workflowFinalResponse: string | undefined;

          if (resolvedDecision.type === "tool_call") {
            const toolResult = await runtimeV4Execution.toolExecutor.execute({
              toolName: resolvedDecision.toolName,
              input: resolvedDecision.input,
              context: {
                userId: request.userId,
                projectId: request.projectId,
                threadId: thread.id,
                runId: run.id,
                source: "agent",
                rawInput: request.message,
                selectedModels: request.selectedModels,
                account: request.account,
                permissions: request.permissions,
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
              emitRuntimeV4Event(stream, event);
            }
            newObservations = [observation];
          }

          if (resolvedDecision.type === "project_patch") {
            const patchResult = await runtimeV4Execution.patchExecutor.apply({
              patch: resolvedDecision.patch,
              context: {
                userId: request.userId,
                projectId: request.projectId,
                threadId: thread.id,
                runId: run.id,
                source: "agent",
                rawInput: request.message,
                selectedModels: request.selectedModels,
                account: request.account,
                permissions: request.permissions,
              },
            });
            for (const event of patchResult.events) {
              emitRuntimeV4Event(stream, event);
            }
            newObservations = [projectPatchExecutionResultToObservation(patchResult)];
          }

          if (resolvedDecision.type === "workflow_call") {
            const result = await runtimeV4Execution.workflowExecutor.execute({
              workflowName: resolvedDecision.workflowName,
              input: resolvedDecision.input,
              projectMind: snapshot,
              context: {
                userId: request.userId,
                projectId: request.projectId,
                threadId: thread.id,
                runId: run.id,
                source: "agent",
                rawInput: request.message,
                selectedModels: request.selectedModels,
                account: request.account,
                permissions: request.permissions,
              },
            });
            for (const event of result.events) {
              emitRuntimeV4Event(stream, event);
            }
            newObservations = [result.observation];
            workflowFinalResponse = result.workflowResult.status === "completed"
              ? result.workflowResult.response
              : result.observation.message;
          }

          if (resolvedDecision.type === "stop_with_error") {
            throw new Error(resolvedDecision.message);
          }

          previousObservations.push(...newObservations);
          const awaitingApproval = newObservations.find((observation) => observation.status === "awaiting_approval");
          if (awaitingApproval) {
            await finish(awaitingApproval.message, {
              decisionType: resolvedDecision.type,
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
              decisionType: resolvedDecision.type,
              goalStatus: progress.status,
            });
            return;
          }

          if (progress.status === "ask_user") {
            await finish(responseForGoalQuestions(progress), {
              decisionType: resolvedDecision.type,
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
