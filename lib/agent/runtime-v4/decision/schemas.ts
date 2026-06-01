import { z } from "zod";

import { agentWorkflowNames } from "@/lib/agent/runtime-v3/types";

export const agentPlanSchema = z.object({
  title: z.string(),
  steps: z.array(
    z.object({
      label: z.string(),
      toolName: z.string().optional(),
      sideEffect: z.enum(["none", "db_write", "asset_generation", "editor_write", "publish", "delete"]).optional(),
      requiresApproval: z.boolean().optional(),
    }),
  ),
});

export const agentDecisionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ask_question"),
    questions: z.array(z.string()).min(1).max(3),
    reason: z.string(),
    expectedFieldTargets: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("propose_plan"),
    plan: agentPlanSchema,
    reason: z.string(),
  }),
  z.object({
    type: z.literal("tool_call"),
    toolName: z.string(),
    input: z.unknown(),
    reason: z.string(),
  }),
  z.object({
    type: z.literal("workflow_call"),
    workflowName: z.enum(agentWorkflowNames),
    input: z.unknown(),
    reason: z.string(),
  }),
  z.object({
    type: z.literal("final_response"),
    response: z.string(),
    confidence: z.number().min(0).max(1).default(0.7),
  }),
  z.object({
    type: z.literal("stop_with_error"),
    message: z.string(),
  }),
]);

export type AgentDecision = z.infer<typeof agentDecisionSchema>;

export const goalCheckSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("satisfied"),
    response: z.string(),
    reason: z.string(),
  }),
  z.object({
    status: z.literal("continue"),
    reason: z.string(),
  }),
  z.object({
    status: z.literal("ask_user"),
    questions: z.array(z.string()).min(1).max(3),
    reason: z.string(),
  }),
  z.object({
    status: z.literal("stop_with_error"),
    message: z.string(),
  }),
]);

export type GoalCheck = z.infer<typeof goalCheckSchema>;
