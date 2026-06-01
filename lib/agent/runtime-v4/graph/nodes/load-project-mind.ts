import { buildProjectMind, compactProjectMindForModel } from "@/lib/agent/runtime-v4/memory/project-mind";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export type LoadProjectMindNodeOptions = {
  stores?: ProjectMindStores;
};

export function createLoadProjectMindNode(options: LoadProjectMindNodeOptions = {}) {
  return async function loadProjectMindNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    const projectMind = await buildProjectMind({
      projectId: state.projectId,
      threadId: state.threadId,
      stores: options.stores,
    });
    const compactProjectMind = compactProjectMindForModel(projectMind);

    return {
      projectMind,
      compactProjectMind,
      currentGoal: {
        originalRequest: state.goal,
        status: "active",
      },
      events: [
        {
          type: "agent_thinking",
          runId: state.runId,
          threadId: state.threadId ?? null,
          message: `Loaded ProjectMind for ${projectMind.project.title}.`,
          snapshot: compactProjectMind,
        },
      ],
      observations: [
        {
          type: "project_mind_loaded",
          message: `Loaded ProjectMind for ${projectMind.project.title}.`,
          data: {
            projectId: projectMind.project.id,
            title: projectMind.project.title,
            status: projectMind.project.status,
          },
        },
      ],
    };
  };
}
