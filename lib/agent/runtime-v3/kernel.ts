import {
  appendAgentMessage,
  completeAgentRun,
  createAgentRun,
  createOrLoadThread,
  failAgentRun,
} from "@/lib/agent/runtime";
import { decideNextStep } from "@/lib/agent/runtime-v3/decision/decide-next-step";
import { buildProjectSnapshot, compactSnapshotForModel } from "@/lib/agent/runtime-v3/context/project-snapshot";
import { createAgentSseResponse } from "@/lib/agent/runtime-v3/stream";
import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import { summarizeRuntimeV3Tools } from "@/lib/agent/runtime-v3/tools/registry";
import { runWorkflow } from "@/lib/agent/runtime-v3/workflows";
import type { AgentDecision, AgentRunRequest, ToolObservation } from "@/lib/agent/runtime-v3/types";

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

export class AgentKernel {
  static run(request: AgentRunRequest) {
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
            runtime: "v3",
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

        const previousObservations: ToolObservation[] = [];
        const toolSummaries = summarizeRuntimeV3Tools();

        for (let step = 0; step < 8; step += 1) {
          const snapshot = await buildProjectSnapshot({
            projectId: request.projectId,
            threadId: thread.id,
          });
          const compactSnapshot = compactSnapshotForModel(snapshot);

          stream.emit("snapshot_loaded", {
            snapshot: compactSnapshot,
          });

          const decision = await decideNextStep({
            message: request.message,
            snapshot,
            toolSummaries,
            previousObservations,
            model: request.selectedModels?.chat,
          });

          stream.emit("decision", {
            decision: JSON.parse(JSON.stringify(decision)),
          });

          if (decision.type === "final_response") {
            await appendAgentMessage({
              projectId: request.projectId,
              threadId: thread.id,
              role: "assistant",
              content: decision.response,
              model: request.selectedModels?.chat ?? null,
              provider: "agent-runtime-v3",
              metadata: {
                decisionType: decision.type,
              },
            });
            await completeAgentRun(run.id, {
              runtime: "v3",
              decisionType: decision.type,
            });
            stream.emit("message_delta", { text: decision.response });
            stream.emit("run_completed", {
              threadId: thread.id,
              runId: run.id,
            });
            return;
          }

          if (decision.type === "ask_question") {
            const response = responseForQuestions(decision);
            await appendAgentMessage({
              projectId: request.projectId,
              threadId: thread.id,
              role: "assistant",
              content: response,
              model: request.selectedModels?.chat ?? null,
              provider: "agent-runtime-v3",
              metadata: {
                decisionType: decision.type,
                expectedFieldTargets: decision.expectedFieldTargets ?? [],
              },
            });
            await completeAgentRun(run.id, {
              runtime: "v3",
              decisionType: decision.type,
              waitingForUser: true,
            });
            stream.emit("message_delta", { text: response });
            stream.emit("run_completed", {
              threadId: thread.id,
              runId: run.id,
              waitingForUser: true,
            });
            return;
          }

          if (decision.type === "propose_plan") {
            const response = responseForPlan(decision);
            stream.emit("plan", {
              plan: JSON.parse(JSON.stringify(decision.plan)),
            });
            await appendAgentMessage({
              projectId: request.projectId,
              threadId: thread.id,
              role: "assistant",
              content: response,
              model: request.selectedModels?.chat ?? null,
              provider: "agent-runtime-v3",
              metadata: {
                decisionType: decision.type,
              },
            });
            await completeAgentRun(run.id, {
              runtime: "v3",
              decisionType: decision.type,
            });
            stream.emit("message_delta", { text: response });
            stream.emit("run_completed", {
              threadId: thread.id,
              runId: run.id,
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

          if (decision.type === "tool_call" || decision.type === "request_approval") {
            const observation = await executeRuntimeV3Tool({
              toolName: decision.toolName,
              rawInput: decision.input,
              context,
              snapshot,
              stream,
            });
            previousObservations.push(observation);
            continue;
          }

          if (decision.type === "workflow_call") {
            const result = await runWorkflow({
              decision,
              context,
              snapshot,
              stream,
            });
            previousObservations.push(...result.observations);

            if (result.finalResponse) {
              await appendAgentMessage({
                projectId: request.projectId,
                threadId: thread.id,
                role: "assistant",
                content: result.finalResponse,
                model: request.selectedModels?.chat ?? null,
                provider: "agent-runtime-v3",
                metadata: {
                  decisionType: decision.type,
                  workflowName: decision.workflowName,
                },
              });
              await completeAgentRun(run.id, {
                runtime: "v3",
                decisionType: decision.type,
                workflowName: decision.workflowName,
                waitingForUser: result.waitingForUser ?? false,
              });
              stream.emit("message_delta", { text: result.finalResponse });
              stream.emit("run_completed", {
                threadId: thread.id,
                runId: run.id,
                waitingForUser: result.waitingForUser ?? false,
              });
              return;
            }
          }

          if (decision.type === "stop_with_error") {
            throw new Error(decision.message);
          }
        }

        throw new Error("Agent step limit exceeded.");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Agent run failed.";
        if (runId) {
          await failAgentRun(runId, message, { runtime: "v3" }).catch(() => null);
        }
        stream.emit("run_failed", {
          error: message,
        });
      }
    });
  }
}
