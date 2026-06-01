import {
  buildProjectMind,
  compactProjectMindForModel,
} from "@/lib/agent/runtime-v4/memory/project-mind";
import type {
  CompactProjectMind,
  ProjectMindSnapshot,
  ProjectMindStores,
} from "@/lib/agent/runtime-v4/memory/memory-types";

export type RuntimeV4ProjectContext = {
  projectMind: ProjectMindSnapshot;
  snapshot: ProjectMindSnapshot;
  compactContext: CompactProjectMind;
};

export async function buildProjectContext(input: {
  projectId: string;
  threadId?: string;
  stores?: ProjectMindStores;
}): Promise<RuntimeV4ProjectContext> {
  const projectMind = await buildProjectMind(input);
  return {
    projectMind,
    snapshot: projectMind,
    compactContext: compactProjectMindForModel(projectMind),
  };
}

export { buildProjectMind, compactProjectMindForModel };
