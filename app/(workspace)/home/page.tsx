"use client";

import Link from "next/link";
import { ArrowRight, Film, Layers3, Loader2, PlusCircle } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { statusLabels } from "@/lib/domain/content";
import type { ContentStatus } from "@/lib/types";

const stageGroups = [
  {
    title: "Capture & Script",
    statuses: ["idea", "scripted", "ready_to_shoot"] as ContentStatus[],
  },
  {
    title: "Production",
    statuses: ["shot", "editing"] as ContentStatus[],
  },
  {
    title: "Published & Learn",
    statuses: ["posted", "analyzed", "archived"] as ContentStatus[],
  },
] as const;

export default function HomePage() {
  const { data, error, isLoading } = useWorkspaceSnapshot();

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </Panel>
    );
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load your projects."}</Panel>;
  }

  const activeProjects = data.cards.filter((card) => !["posted", "analyzed", "archived"].includes(card.status));
  const recentProjects = data.cards.slice(0, 3);
  const continueProject = data.cards[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Project Hub"
          title="Projects"
          description="Stage-based video projects, recent work, and direct handoff into the active workspace."
        />
        <div className="flex items-center gap-2">
          <Link href="/inbox">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New project
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="cmd-label text-accent">Continue</p>
              <h2 className="mt-1 text-xl font-semibold">
                {continueProject ? continueProject.title : "No active project"}
              </h2>
            </div>
            {continueProject ? <Badge className="border-border">{statusLabels[continueProject.status]}</Badge> : null}
          </div>
          <p className="text-sm text-muted">
            {continueProject
              ? `${continueProject.platform.toUpperCase()} · ${continueProject.format.toUpperCase()} · ${continueProject.assets.length} assets`
              : "Capture an idea to create the first project."}
          </p>
          {continueProject ? (
            <div className="flex gap-2">
              <Link href={`/projects/${continueProject.id}`}>
                <Button>Open workspace</Button>
              </Link>
              <Link href={`/editor/${continueProject.id}`}>
                <Button variant="secondary">Open editor</Button>
              </Link>
            </div>
          ) : null}
        </Panel>

        <Panel className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="cmd-label">Active</p>
            <p className="mt-2 text-3xl font-semibold">{activeProjects.length}</p>
          </div>
          <div>
            <p className="cmd-label">Inbox Queue</p>
            <p className="mt-2 text-3xl font-semibold">{data.stats.inbox}</p>
          </div>
          <div>
            <p className="cmd-label">Ready To Shoot</p>
            <p className="mt-2 text-3xl font-semibold">{data.stats.readyToShoot}</p>
          </div>
        </Panel>
      </div>

      <Panel className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="cmd-label text-accent">Recent</p>
            <h2 className="mt-1 text-lg font-semibold">Recent projects</h2>
          </div>
          <Link href="/board" className="text-sm text-accent">
            Open board
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {recentProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border border-border/60 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <Badge className="border-border">{statusLabels[project.status]}</Badge>
                <Film className="h-4 w-4 text-muted" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{project.title}</h3>
              <p className="mt-2 text-sm text-muted">
                {project.platform.toUpperCase()} · {project.format.toUpperCase()} · {project.assets.length} assets
              </p>
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        {stageGroups.map((group) => {
          const projects = data.cards.filter((card) => group.statuses.includes(card.status));
          return (
            <Panel key={group.title} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cmd-label text-accent">{group.title}</p>
                  <h2 className="mt-1 text-lg font-semibold">{projects.length} projects</h2>
                </div>
                <Layers3 className="h-4 w-4 text-muted" />
              </div>
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted">No projects in this stage.</p>
                ) : (
                  projects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-3 text-sm">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-xs text-muted">{statusLabels[project.status]}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted" />
                    </Link>
                  ))
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
