"use client";

import { useRouter } from "next/navigation";

import { ProjectChatPanel } from "@/components/workspace/project-chat-panel";
import type { ProjectWorkspace } from "@/lib/data/repository";

export function ProjectChatRouteClient({
  project,
}: {
  project: ProjectWorkspace;
}) {
  const router = useRouter();

  return <ProjectChatPanel project={project} onRefresh={() => router.refresh()} />;
}
