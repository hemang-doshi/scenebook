import type { AgentCommand } from "@/lib/agent/types";
import { analyzeTool } from "@/lib/agent/tools/analyze";
import { formJsonPromptTool } from "@/lib/agent/tools/form-json-prompt";
import { generateTool, generateImageTool, generateVideoTool, generateAudioTool } from "@/lib/agent/tools/generate";
import { importToEditorTool } from "@/lib/agent/tools/import-to-editor";
import { instagramTool } from "@/lib/agent/tools/instagram";
import { scriptTool } from "@/lib/agent/tools/script";
import { storyboardTool } from "@/lib/agent/tools/storyboard";
import { tasksTool } from "@/lib/agent/tools/tasks";
import { exportTool } from "@/lib/agent/tools/export";
import type { AgentTool, AgentToolAvailability } from "@/lib/agent/tools/types";

type PromptTool = AgentTool<{ prompt: string }>;

export const agentTools = [
  scriptTool,
  formJsonPromptTool,
  generateTool,
  generateImageTool,
  generateVideoTool,
  generateAudioTool,
  storyboardTool,
  tasksTool,
  instagramTool,
  analyzeTool,
  importToEditorTool,
  exportTool,
] satisfies PromptTool[];

const toolMap = new Map(agentTools.map((tool) => [tool.command, tool]));
const toolNameMap = new Map(agentTools.map((tool) => [tool.name, tool]));

export const supportedAgentCommands = new Set<AgentCommand>(
  agentTools.map((tool) => tool.command as AgentCommand),
);

export function isSupportedAgentCommand(value: string): value is AgentCommand {
  return supportedAgentCommands.has(value as AgentCommand);
}

export function getAgentTool(command: AgentCommand) {
  return toolMap.get(command);
}

export function getAgentToolByName(name: string) {
  return toolNameMap.get(name);
}

type ToolAvailabilityCarrier = {
  name: string;
  availability?: AgentToolAvailability;
};

export function getAgentToolAvailability(tool: ToolAvailabilityCarrier): AgentToolAvailability {
  return tool.availability ?? "available";
}

export function isAgentToolAvailable(tool: ToolAvailabilityCarrier) {
  return getAgentToolAvailability(tool) === "available";
}

export function getUnavailableAgentToolMessage(tool: ToolAvailabilityCarrier) {
  const availability = getAgentToolAvailability(tool);

  if (availability === "requires_integration") {
    return `${tool.name} is not wired to a live integration yet.`;
  }

  if (availability === "requires_configuration") {
    return `${tool.name} needs configuration before it can run.`;
  }

  if (availability === "stubbed") {
    return `${tool.name} is a stub and cannot safely execute yet.`;
  }

  if (availability === "disabled") {
    return `${tool.name} is currently disabled.`;
  }

  return `${tool.name} is unavailable.`;
}

export function listSupportedAgentCommands() {
  return agentTools.map((tool) => `/${tool.command}`);
}
