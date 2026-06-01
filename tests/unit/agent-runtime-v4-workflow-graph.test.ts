import { describe, expect, test, vi } from "vitest";

import { createExecuteStepNode } from "@/lib/agent/runtime-v4/graph/nodes/execute-step";
import type { WorkflowExecutionResult } from "@/lib/agent/runtime-v4/workflows/workflow-executor";

const baseState = {
  projectId: "project-1",
  userId: "user-1",
  threadId: "thread-1",
  runId: "run-1",
  goal: "Help me make a reel about building SceneBook",
  errors: [],
  toolResults: [],
};

function completedResult(): WorkflowExecutionResult {
  return {
    workflowResult: {
      status: "completed",
      workflowName: "plan_reel",
      response: "Creative plan ready.",
    },
    observation: {
      toolName: "plan_reel",
      status: "completed",
      message: "Creative plan ready.",
      output: {
        kind: "creative_workflow",
        workflowName: "plan_reel",
      },
    },
    events: [{
      type: "workflow_completed",
      runId: "run-1",
      threadId: "thread-1",
      workflowName: "plan_reel",
      message: "Creative plan ready.",
    }],
  };
}

describe("runtime-v4 workflow graph node", () => {
  test("execute-step calls workflow executor for workflow_call decisions", async () => {
    const workflowExecutor = {
      execute: vi.fn(async () => completedResult()),
    };
    const node = createExecuteStepNode({ workflowExecutor });

    await node({
      ...baseState,
      currentDecision: {
        type: "workflow_call",
        workflowName: "plan_reel",
        input: { prompt: "Help me make a reel about building SceneBook" },
        reason: "Use the creative planning workflow.",
      },
    } as never);

    expect(workflowExecutor.execute).toHaveBeenCalledWith(expect.objectContaining({
      workflowName: "plan_reel",
      input: { prompt: "Help me make a reel about building SceneBook" },
      context: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        source: "agent",
      }),
    }));
  });

  test("workflow needs_input becomes ask_question and final response", async () => {
    const workflowExecutor = {
      execute: vi.fn(async (): Promise<WorkflowExecutionResult> => ({
        workflowResult: {
          status: "needs_input",
          workflowName: "plan_reel",
          questions: ["Who is the viewer?"],
          reason: "Audience is needed.",
        },
        observation: {
          toolName: "plan_reel",
          status: "blocked",
          message: "Audience is needed.",
          output: { questions: ["Who is the viewer?"] },
        },
        events: [],
      })),
    };
    const node = createExecuteStepNode({ workflowExecutor });

    const update = await node({
      ...baseState,
      currentDecision: {
        type: "workflow_call",
        workflowName: "plan_reel",
        input: { prompt: "Make a reel" },
        reason: "Use the creative planning workflow.",
      },
    } as never);

    expect(update.askQuestion).toMatchObject({
      questions: ["Who is the viewer?"],
    });
    expect(update.finalResponse).toContain("Who is the viewer?");
  });

  test("workflow failure becomes a recoverable observation", async () => {
    const workflowExecutor = {
      execute: vi.fn(async (): Promise<WorkflowExecutionResult> => ({
        workflowResult: {
          status: "failed",
          workflowName: "plan_reel",
          error: {
            code: "TEST_FAILURE",
            message: "Workflow failed.",
            recoverable: true,
          },
        },
        observation: {
          toolName: "plan_reel",
          status: "blocked",
          message: "Workflow failed.",
          output: { recoverable: true },
        },
        events: [],
      })),
    };
    const node = createExecuteStepNode({ workflowExecutor });

    const update = await node({
      ...baseState,
      currentDecision: {
        type: "workflow_call",
        workflowName: "plan_reel",
        input: { prompt: "Make a reel" },
        reason: "Use the creative planning workflow.",
      },
    } as never);

    expect(update.toolResults).toEqual([
      expect.objectContaining({
        status: "blocked",
        message: "Workflow failed.",
      }),
    ]);
  });
});
