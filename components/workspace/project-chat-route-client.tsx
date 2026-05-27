"use client";

import { AgentChatIsland } from "@/components/agent/agent-chat-island";
import type { ProjectWorkspace } from "@/lib/data/repository";

export function ProjectChatRouteClient({
  project,
}: {
  project: ProjectWorkspace;
}) {
  return <AgentChatIsland project={project} />;
}
