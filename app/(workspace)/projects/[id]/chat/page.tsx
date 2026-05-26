import { Panel } from "@/components/ui/panel";
import { getProjectWorkspace } from "@/lib/data/repository";
import { ProjectChatRouteClient } from "@/components/workspace/project-chat-route-client";

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectWorkspace(id);

  if (!project) {
    return <Panel>Unable to load project chat.</Panel>;
  }

  return <ProjectChatRouteClient project={project} />;
}
