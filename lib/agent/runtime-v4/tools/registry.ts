import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";

import { createProjectArtifactTool } from "@/lib/agent/runtime-v4/tools/workspace/create-project-artifact";
import { createScriptVersionTool } from "@/lib/agent/runtime-v4/tools/workspace/create-script-version";
import { recordProjectMemoryTool } from "@/lib/agent/runtime-v4/tools/workspace/record-project-memory";
import { updateActiveGoalTool } from "@/lib/agent/runtime-v4/tools/workspace/update-active-goal";
import { updateCreativeBriefTool } from "@/lib/agent/runtime-v4/tools/workspace/update-creative-brief";
import { updateScriptLabTool } from "@/lib/agent/runtime-v4/tools/workspace/update-script-lab";
import { updateShootPackTool } from "@/lib/agent/runtime-v4/tools/workspace/update-shoot-pack";

const runtimeV4WorkspaceTools = [
  updateCreativeBriefTool,
  updateActiveGoalTool,
  createScriptVersionTool,
  updateScriptLabTool,
  updateShootPackTool,
  createProjectArtifactTool,
  recordProjectMemoryTool,
] satisfies AgentTool[];

export const runtimeV4ToolNames = [
  "update_creative_brief",
  "update_active_goal",
  "create_script_version",
  "update_script_lab",
  "update_shoot_pack",
  "create_project_artifact",
  "record_project_memory",
] as const;

export type RuntimeV4ToolName = (typeof runtimeV4ToolNames)[number];

export class ToolRegistry {
  private readonly toolsByName: Map<string, AgentTool>;

  constructor(tools: AgentTool[] = runtimeV4WorkspaceTools) {
    this.toolsByName = new Map();

    for (const tool of tools) {
      if (this.toolsByName.has(tool.name)) {
        throw new Error(`Duplicate runtime-v4 tool registered: ${tool.name}`);
      }
      this.toolsByName.set(tool.name, tool);
    }
  }

  get(name: string) {
    return this.toolsByName.get(name);
  }

  list() {
    return [...this.toolsByName.values()];
  }

  summarize() {
    return this.list().map((tool) => ({
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      riskLevel: tool.riskLevel,
      sideEffect: tool.sideEffect,
      approvalPolicy: tool.approvalPolicy,
      availability: tool.availability,
    }));
  }
}

const defaultRegistry = new ToolRegistry();

export function createRuntimeV4ToolRegistry(tools?: AgentTool[]) {
  return new ToolRegistry(tools ?? runtimeV4WorkspaceTools);
}

export function listRuntimeV4Tools() {
  return defaultRegistry.list();
}

export function getRuntimeV4Tool(name: RuntimeV4ToolName): AgentTool;
export function getRuntimeV4Tool(name: string): AgentTool | undefined;
export function getRuntimeV4Tool(name: string) {
  return defaultRegistry.get(name);
}

export function summarizeRuntimeV4Tools() {
  return defaultRegistry.summarize();
}
