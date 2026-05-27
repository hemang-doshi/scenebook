import type { AgentCommand } from "@/lib/agent/types";
import { analyzeTool } from "@/lib/agent/tools/analyze";
import { formJsonPromptTool } from "@/lib/agent/tools/form-json-prompt";
import { instagramTool } from "@/lib/agent/tools/instagram";
import { scriptTool } from "@/lib/agent/tools/script";
import { tasksTool } from "@/lib/agent/tools/tasks";
import type { AgentTool } from "@/lib/agent/tools/types";

type PromptTool = AgentTool<{ prompt: string }>;

export const agentTools = [
  scriptTool,
  formJsonPromptTool,
  tasksTool,
  instagramTool,
  analyzeTool,
] satisfies PromptTool[];

const toolMap = new Map(agentTools.map((tool) => [tool.command, tool]));

export const supportedAgentCommands = new Set<AgentCommand>(
  agentTools.map((tool) => tool.command as AgentCommand),
);

export function isSupportedAgentCommand(value: string): value is AgentCommand {
  return supportedAgentCommands.has(value as AgentCommand);
}

export function getAgentTool(command: AgentCommand) {
  return toolMap.get(command);
}

export function listSupportedAgentCommands() {
  return agentTools.map((tool) => `/${tool.command}`);
}
