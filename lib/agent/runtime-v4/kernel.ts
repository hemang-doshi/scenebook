import {
  appendAgentMessage,
  completeAgentRun,
  createAgentRun,
  createOrLoadThread,
  failAgentRun,
} from "@/lib/agent/runtime";
import { createAgentSseResponse } from "@/lib/agent/runtime-v3/stream";
import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import { summarizeRuntimeV3Tools } from "@/lib/agent/runtime-v3/tools/registry";
import { runWorkflow } from "@/lib/agent/runtime-v3/workflows";
import type {
  AgentDecision as RuntimeV3AgentDecision,
  AgentRunRequest,
  ToolObservation,
} from "@/lib/agent/runtime-v3/types";
import { decideNextStep } from "@/lib/agent/runtime-v4/decision/decision-engine";
import { checkGoalProgress } from "@/lib/agent/runtime-v4/decision/goal-checker";
import type { AgentDecision, GoalCheck } from "@/lib/agent/runtime-v4/decision/schemas";
import { runSceneBookGraph } from "@/lib/agent/runtime-v4/graph/scenebook-graph";
import { buildProjectContext } from "@/lib/agent/runtime-v4/context/context-builder";
import {
  buildRunSummaryFromObservations,
  saveRunSummary,
} from "@/lib/agent/runtime-v4/memory/run-summary-store";
import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";
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

function runLangGraphSpike(request: AgentRunRequest) {
  return createAgentSseResponse(async (stream) => {
    const graphState = await runSceneBookGraph({
      projectId: request.projectId,
      threadId: request.threadId,
      userId: request.userId,
      goal: request.message,
      messages: [{ role: "user", content: request.message }],
    });
    const runId = "langgraph-spike";

    stream.emit("run_started", {
      threadId: request.threadId ?? null,
      runId,
    });
    stream.emitLegacyMeta({
      threadId: request.threadId ?? null,
      runId,
    });
    stream.emit("snapshot_loaded", {
      snapshot: graphState.compactProjectMind ?? null,
    });

    if (graphState.plan) {
      stream.emit("decision", {
        decision: {
          type: "propose_plan",
          plan: graphState.plan,
          reason: "LangGraph spike path produced a no-write plan.",
        },
      });
      stream.emit("plan", {
        plan: graphState.plan,
      });
    }

    stream.emit("message_delta", {
      text: graphState.finalResponse ?? "",
    });
    stream.emit("run_completed", {
      threadId: request.threadId ?? null,
      runId,
      waitingForUser: false,
    });
  });
}

export class AgentKernel {
  static run(request: AgentRunRequest) {
    if (resolveAgentOrchestrator() === "langgraph") {
      return runLangGraphSpike(request);
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
        const previousObservations: ToolObservation[] = [];
        const toolSummaries = summarizeRuntimeV3Tools();

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
            rawInput: request.message,
            snapshot,
            selectedModels: request.selectedModels,
          };

          let newObservations: ToolObservation[] = [];
          let workflowFinalResponse: string | undefined;

          if (decision.type === "tool_call") {
            const observation = await executeRuntimeV3Tool({
              toolName: decision.toolName,
              rawInput: decision.input,
              context,
              snapshot,
              stream,
            });
            newObservations = [observation];
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
