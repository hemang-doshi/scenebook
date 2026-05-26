"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageSquare, PlusCircle } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";
import type { ProjectSummary } from "@/lib/data/repository";
import type { ContentFormat, ContentPlatform } from "@/lib/types";

const formats: ContentFormat[] = ["reel", "short", "tiktok", "carousel", "post", "vlog"];
const platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok", "linkedin", "x"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function HomePageClient({
  initialCreateOpen,
  projects,
}: {
  initialCreateOpen: boolean;
  projects: ProjectSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);
  const [createError, setCreateError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("short");
  const [platform, setPlatform] = useState<ContentPlatform>("youtube");

  const readyToShootCount = projects.filter((project) => project.status === "ready_to_shoot").length;

  function openCreateForm() {
    setIsCreateOpen(true);
    router.replace("/home?create=1");
  }

  function closeCreateForm() {
    setIsCreateOpen(false);
    setCreateError(null);
    router.replace("/home");
  }

  function handleCreateProject() {
    if (!title.trim()) return;

    startTransition(async () => {
      try {
        setCreateError(null);
        const project = await fetchJson<{ id: string }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            title,
            format,
            platform,
          }),
        });
        setTitle("");
        closeCreateForm();
        router.push(`/projects/${project.id}`);
      } catch (caught) {
        setCreateError(caught instanceof Error ? caught.message : "Unable to create project.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Project Hub"
          title="Projects"
          description="A table-first index for every project, with direct handoff into workspace, chat, and editor."
        />
        <Button onClick={openCreateForm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      {isCreateOpen ? (
        <Panel className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="cmd-label text-accent">New Project</p>
              <h2 className="mt-1 text-lg font-semibold">Lightweight project setup</h2>
              <p className="mt-2 text-sm text-muted">
                Start with the essentials, then continue inside the full project workspace.
              </p>
            </div>
            <Button variant="ghost" className="text-xs" onClick={closeCreateForm}>
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs text-muted">
              Project title
              <Input
                className="mt-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Creator workflow teardown"
              />
            </label>
            <label className="text-xs text-muted">
              Format
              <CustomSelect
                value={format}
                onChange={(value) => setFormat(value as ContentFormat)}
                options={formats.map((item) => ({ value: item, label: item.toUpperCase() }))}
                className="mt-2"
              />
            </label>
            <label className="text-xs text-muted">
              Platform
              <CustomSelect
                value={platform}
                onChange={(value) => setPlatform(value as ContentPlatform)}
                options={platforms.map((item) => ({ value: item, label: item.toUpperCase() }))}
                className="mt-2"
              />
            </label>
          </div>

          {createError ? <p className="text-xs text-danger">{createError}</p> : null}

          <div className="flex justify-end">
            <Button disabled={isPending || !title.trim()} onClick={handleCreateProject}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isPending ? "Creating project" : "Create project"}
            </Button>
          </div>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <p className="cmd-label text-accent">Project Index</p>
            <h2 className="mt-1 text-lg font-semibold">{projects.length} projects</h2>
          </div>
          <Badge className="border-border bg-black/20 text-muted">{readyToShootCount} ready to shoot</Badge>
        </div>

        {projects.length === 0 ? (
          <div className="py-10 text-sm text-muted">
            No projects yet. Create the first one to open the project workspace flow.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-muted">
                <tr className="border-b border-border/40">
                  <th className="px-3 py-3 font-medium">Project</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Format</th>
                  <th className="px-3 py-3 font-medium">Platform</th>
                  <th className="px-3 py-3 font-medium">Assets</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-border/30 last:border-b-0">
                    <td className="px-3 py-4">
                      <div>
                        <p className="font-medium text-foreground">{project.title}</p>
                        <p className="text-xs text-muted">Project workspace</p>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <Badge className="border-border bg-black/20">{statusLabels[project.status]}</Badge>
                    </td>
                    <td className="px-3 py-4 text-muted">{project.format.toUpperCase()}</td>
                    <td className="px-3 py-4 text-muted">{project.platform.toUpperCase()}</td>
                    <td className="px-3 py-4 text-muted">{project.assetCount}</td>
                    <td className="px-3 py-4 text-muted">{formatDate(project.updatedAt)}</td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="secondary" className="h-8 px-3 text-xs">
                            Workspace
                          </Button>
                        </Link>
                        <Link href={`/projects/${project.id}/chat`}>
                          <Button variant="secondary" className="h-8 px-3 text-xs">
                            <MessageSquare className="mr-2 h-3.5 w-3.5" />
                            Chat
                          </Button>
                        </Link>
                        <Link href={`/editor/${project.id}`}>
                          <Button className="h-8 px-3 text-xs">
                            Editor
                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
