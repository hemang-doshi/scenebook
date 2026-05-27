import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

const availableActions = [
  "connect_account",
  "check_caption",
  "prepare_publish",
  "sync_analytics",
] as const;

export const instagramTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Instagram Stub",
  command: "instagram",
  description: "Returns the fake Instagram actions available in this phase.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "none",
  handler(_ctx, input) {
    const requestedAction = input.prompt || null;

    return {
      message: "Instagram tool is running in dummy mode. No real publish action was called.",
      output: {
        mode: "dummy",
        requestedAction,
        availableActions: [...availableActions],
      },
    };
  },
};
