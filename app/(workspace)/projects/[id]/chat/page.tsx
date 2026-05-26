"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { ProjectChatPanel } from "@/components/workspace/project-chat-panel";
import { Panel } from "@/components/ui/panel";
import { useProjectWorkspace } from "@/components/workspace/hooks";

export default function ProjectChatPage() {
  const params = useParams<{ id: string }>();
  const { project, error, isLoading, refresh } = useProjectWorkspace(params.id);

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </Panel>
    );
  }

  if (error || !project) {
    return <Panel>{error ?? "Unable to load project chat."}</Panel>;
  }

  return <ProjectChatPanel project={project} onRefresh={refresh} />;
}
