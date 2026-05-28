import type { ProjectWorkspace } from "@/lib/data/repository";
import {
  agentRuntimePlugins,
  getAvailablePluginsForProject as getAvailableRuntimePluginsForProject,
} from "@/lib/agent/runtime-v2/plugins";
import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";

export const agentRuntimeTools = agentRuntimePlugins.flatMap((plugin) => plugin.tools);

const toolMap = new Map(agentRuntimeTools.map((tool) => [tool.name, tool]));

export function getToolByName(name: string): AgentRuntimeTool | undefined {
  return toolMap.get(name);
}

export function getAvailablePluginsForProject(project: ProjectWorkspace | null): readonly AgentPlugin[] {
  return getAvailableRuntimePluginsForProject(project);
}
