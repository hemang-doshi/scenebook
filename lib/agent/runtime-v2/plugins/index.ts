import type { ProjectWorkspace } from "@/lib/data/repository";
import type { AgentPlugin } from "@/lib/agent/runtime-v2/tools/types";
import { assetsPlugin } from "@/lib/agent/runtime-v2/plugins/assets-plugin";
import { editorPlugin } from "@/lib/agent/runtime-v2/plugins/editor-plugin";
import { instagramPlugin } from "@/lib/agent/runtime-v2/plugins/instagram-plugin";
import { scriptPlugin } from "@/lib/agent/runtime-v2/plugins/script-plugin";
import { workspacePlugin } from "@/lib/agent/runtime-v2/plugins/workspace-plugin";

export { assetsPlugin } from "@/lib/agent/runtime-v2/plugins/assets-plugin";
export { editorPlugin } from "@/lib/agent/runtime-v2/plugins/editor-plugin";
export { instagramPlugin } from "@/lib/agent/runtime-v2/plugins/instagram-plugin";
export { scriptPlugin } from "@/lib/agent/runtime-v2/plugins/script-plugin";
export { workspacePlugin } from "@/lib/agent/runtime-v2/plugins/workspace-plugin";
export type { AgentPlugin } from "@/lib/agent/runtime-v2/tools/types";

export const agentRuntimePlugins = [
  scriptPlugin,
  workspacePlugin,
  assetsPlugin,
  editorPlugin,
  instagramPlugin,
] satisfies AgentPlugin[];

export function getAvailablePluginsForProject(project: ProjectWorkspace | null): readonly AgentPlugin[] {
  return agentRuntimePlugins.filter((plugin) => {
    if (plugin.name !== "instagram") {
      return true;
    }

    return project?.platform === "instagram";
  });
}
