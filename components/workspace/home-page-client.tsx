/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Clapperboard,
  Film,
  LayoutGrid,
  MessageSquare,
  PlusCircle,
  Rows3,
  Sparkles,
  Trash2,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { CustomSelect } from "@/components/ui/custom-select";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";
import type { ProjectSummary } from "@/lib/data/repository";
import type { ContentFormat, ContentPlatform, ContentStatus } from "@/lib/types";

const formats: ContentFormat[] = ["reel", "short", "tiktok", "carousel", "post", "vlog"];
const platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok", "linkedin", "x"];
const statuses: ContentStatus[] = ["idea", "scripted", "ready_to_shoot", "shot", "editing", "posted", "analyzed", "archived"];

type BadgeVariant = ComponentProps<typeof Badge>["variant"];
type ButtonVariant = ComponentProps<typeof Button>["variant"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadgeVariant(status: ContentStatus): BadgeVariant {
  if (status === "idea" || status === "scripted") return "creative";
  if (status === "ready_to_shoot" || status === "shot") return "warning";
  if (status === "editing") return "runtime";
  if (status === "posted" || status === "analyzed") return "applied";
  return "muted";
}

function formatBadgeVariant(format: ContentFormat): BadgeVariant {
  if (format === "reel" || format === "short" || format === "tiktok") return "runtime";
  if (format === "carousel" || format === "post") return "creative";
  return "model";
}

function nextActionFor(project: ProjectSummary): {
  label: string;
  buttonLabel: string;
  detail: string;
  href: string;
  buttonVariant: ButtonVariant;
  icon: "agent" | "hub" | "editor" | "analytics";
} {
  if (project.status === "idea" || project.status === "scripted") {
    return {
      label: "Agent",
      buttonLabel: "Agent",
      detail: "Shape the brief, script, and shoot package.",
      href: `/projects/${project.id}/chat`,
      buttonVariant: "runtime",
      icon: "agent",
    };
  }

  if (project.status === "editing") {
    return {
      label: "Open Editor",
      buttonLabel: "Editor",
      detail: "Cut the reel once the package is ready.",
      href: `/editor/${project.id}`,
      buttonVariant: "primary",
      icon: "editor",
    };
  }

  if (project.status === "posted" || project.status === "analyzed") {
    return {
      label: "View Analytics",
      buttonLabel: "Analytics",
      detail: "Review what worked and capture the next learning.",
      href: "/analytics",
      buttonVariant: "secondary",
      icon: "analytics",
    };
  }

  return {
    label: "Hub",
    buttonLabel: "Hub",
    detail: "Check shoot readiness and production details.",
    href: `/projects/${project.id}`,
    buttonVariant: "secondary",
    icon: "hub",
  };
}

function ActionIcon({ icon }: { icon: ReturnType<typeof nextActionFor>["icon"] }) {
  if (icon === "agent") return <MessageSquare className="mr-1.5 h-3.5 w-3.5" />;
  if (icon === "editor") return <Film className="mr-1.5 h-3.5 w-3.5" />;
  if (icon === "analytics") return <BarChart3 className="mr-1.5 h-3.5 w-3.5" />;
  return <Clapperboard className="mr-1.5 h-3.5 w-3.5" />;
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
  const [viewMode, setViewMode] = useState<"gallery" | "table">("gallery");
  const [localProjects, setLocalProjects] = useState(projects);

  useEffect(() => {
    setIsCreateOpen(initialCreateOpen);
  }, [initialCreateOpen]);

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const readyToShootCount = localProjects.filter((project) => project.status === "ready_to_shoot").length;
  const editingCount = localProjects.filter((project) => project.status === "editing").length;
  const learningCount = localProjects.filter((project) => project.status === "posted" || project.status === "analyzed").length;
  const activeProjects = localProjects.filter((project) => project.status !== "archived");

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
        setIsCreateOpen(false);
        setCreateError(null);
        router.push(`/projects/${project.id}`);
      } catch (caught) {
        setCreateError(caught instanceof Error ? caught.message : "Unable to create project.");
      }
    });
  }

  function handleProjectStatusChange(projectId: string, status: ContentStatus) {
    const previousProjects = localProjects;
    setLocalProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status,
            }
          : project,
      ),
    );

    startTransition(async () => {
      try {
        await fetchJson(`/api/projects/${projectId}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
      } catch {
        setLocalProjects(previousProjects);
      }
    });
  }

  function handleDeleteProject(projectId: string) {
    const previousProjects = localProjects;
    setLocalProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));

    startTransition(async () => {
      try {
        await fetchJson(`/api/projects/${projectId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "archived" }),
        });
      } catch {
        setLocalProjects(previousProjects);
      }
    });
  }

  return (
    <div className="mx-auto max-w-[var(--container)] space-y-8 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Production Command Center"
          title="Your reels in motion"
          description="Plan, package, edit, and learn from every short-form project."
        />
        <Button variant="primary" className="h-10 px-4 text-xs font-semibold" onClick={openCreateForm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      {isCreateOpen ? (
        <Panel className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-[var(--muted)]">New Project</p>
              <h2 className="font-display text-xl font-bold text-[var(--ink)]">Lightweight project setup</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Start with the essentials, then continue inside the full project workspace.
              </p>
            </div>
            <Button variant="ghost" className="h-9 px-3 text-xs" onClick={closeCreateForm}>
              Cancel
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label htmlFor="project-title" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
                Project title
              </label>
              <Input
                id="project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Creator workflow teardown"
              />
            </div>
            <div>
              <label htmlFor="project-format" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
                Format
              </label>
              <CustomSelect
                id="project-format"
                value={format}
                onChange={(value) => setFormat(value as ContentFormat)}
                options={formats.map((item) => ({ value: item, label: item.toUpperCase() }))}
              />
            </div>
            <div>
              <label htmlFor="project-platform" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
                Platform
              </label>
              <CustomSelect
                id="project-platform"
                value={platform}
                onChange={(value) => setPlatform(value as ContentPlatform)}
                options={platforms.map((item) => ({ value: item, label: item.toUpperCase() }))}
              />
            </div>
          </div>

          {createError ? <p className="text-xs text-[var(--danger)]">{createError}</p> : null}

          <div className="flex justify-end border-t border-[var(--hairline)] pt-2">
            <Button
              variant="primary"
              className="h-10 px-5 text-xs font-semibold"
              disabled={isPending || !title.trim()}
              onClick={handleCreateProject}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {isPending ? "Creating project" : "Create project"}
            </Button>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Panel variant="floating" className="p-4 shadow-none">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Total projects</p>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--ink)]">{localProjects.length}</p>
        </Panel>
        <Panel variant="floating" className="p-4 shadow-none">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Ready to shoot</p>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--ink)]">{readyToShootCount}</p>
        </Panel>
        <Panel variant="floating" className="p-4 shadow-none">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">In editing</p>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--ink)]">{editingCount}</p>
        </Panel>
        <Panel variant="floating" className="p-4 shadow-none">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Posted/analyzed</p>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--ink)]">{learningCount}</p>
        </Panel>
      </div>

      {localProjects.length === 0 ? (
        <Panel className="py-16 text-center text-sm text-[var(--muted)]">
          No projects yet. Create the first one to open the project workspace flow.
        </Panel>
      ) : (
        <section className="space-y-4" aria-label="Active productions">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--ink)]">Active productions</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Every reel with its current stage and next move.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="muted">{activeProjects.length} active</Badge>
              <div
                className="inline-flex rounded-[var(--radius-pill)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel-2)_64%,transparent)] p-1"
                role="group"
                aria-label="Project view"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("gallery")}
                  aria-label="Expanded gallery view"
                  aria-pressed={viewMode === "gallery"}
                  className={[
                    "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] transition-colors",
                    viewMode === "gallery"
                      ? "bg-[var(--white)] text-[var(--black)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]",
                  ].join(" ")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Compact table view"
                  aria-pressed={viewMode === "table"}
                  className={[
                    "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] transition-colors",
                    viewMode === "table"
                      ? "bg-[var(--white)] text-[var(--black)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]",
                  ].join(" ")}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "gallery" ? (
            <div className="grid gap-4 lg:grid-cols-2" role="region" aria-label="Expanded gallery">
              {activeProjects.map((project) => {
                const action = nextActionFor(project);

                return (
                  <article key={project.id} className="h-full">
                    <Card className="flex h-full flex-col gap-5 p-5">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusBadgeVariant(project.status)}>{statusLabels[project.status]}</Badge>
                          <Badge variant={formatBadgeVariant(project.format)}>{project.format.toUpperCase()}</Badge>
                          <Badge variant="muted">{project.platform.toUpperCase()}</Badge>
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold text-[var(--ink)]">{project.title}</h3>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {project.assetCount} assets | Updated {formatDate(project.updatedAt)}
                          </p>
                        </div>
                        <div className="max-w-2xl rounded-[var(--radius-md)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel-2)_42%,transparent)] p-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="mt-0.5 h-4 w-4 text-[var(--blue-2)]" />
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Next action</p>
                              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{action.label}</p>
                              <p className="mt-0.5 text-xs text-[var(--muted)]">{action.detail}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                        <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Stage</p>
                        <CustomSelect
                          value={project.status}
                          onChange={(value) => handleProjectStatusChange(project.id, value as ContentStatus)}
                          options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))}
                          triggerClassName="h-9 text-xs"
                        />
                        </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2" data-testid="project-card-actions">
                        <Link href={action.href} className="min-w-0">
                          <Button variant={action.buttonVariant} className="h-9 w-full px-3 text-xs">
                            <ActionIcon icon={action.icon} />
                            {action.buttonLabel}
                          </Button>
                        </Link>
                        <Link href={`/projects/${project.id}`} className="min-w-0">
                          <Button variant="secondary" className="h-9 w-full px-3 text-xs">
                            <Clapperboard className="mr-1.5 h-3.5 w-3.5" />
                            Hub
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`Delete ${project.title}`}
                          onClick={() => handleDeleteProject(project.id)}
                          className="h-9 w-9 px-0 py-0 text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      </div>
                    </Card>
                  </article>
                );
              })}
            </div>
          ) : (
            <Panel className="overflow-visible p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-left text-sm" aria-label="Production table">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="w-[34%] px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Project</th>
                      <th className="w-[18%] px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Stage</th>
                      <th className="w-[14%] px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Format</th>
                      <th className="w-[14%] px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Platform</th>
                      <th className="w-[20%] px-5 py-3 text-right font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProjects.map((project) => {
                      const action = nextActionFor(project);

                      return (
                        <tr key={project.id} className="border-b border-[var(--line)] last:border-b-0">
                          <td className="px-5 py-4">
                            <p className="truncate font-semibold text-[var(--ink)]">{project.title}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {project.assetCount} assets | Updated {formatDate(project.updatedAt)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <CustomSelect
                              value={project.status}
                              onChange={(value) => handleProjectStatusChange(project.id, value as ContentStatus)}
                              options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))}
                              triggerClassName="h-9 text-xs"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant={formatBadgeVariant(project.format)}>{project.format.toUpperCase()}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="muted">{project.platform.toUpperCase()}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link href={action.href}>
                                <Button variant={action.buttonVariant} className="h-8 px-3 text-xs">
                                  <ActionIcon icon={action.icon} />
                                  {action.buttonLabel}
                                </Button>
                              </Link>
                              <Link href={`/projects/${project.id}`}>
                                <Button variant="secondary" className="h-8 px-3 text-xs">
                                  <Clapperboard className="mr-1.5 h-3.5 w-3.5" />
                                  Hub
                                </Button>
                              </Link>
                              <Button
                                type="button"
                                variant="ghost"
                                aria-label={`Delete ${project.title}`}
                                onClick={() => handleDeleteProject(project.id)}
                                className="h-8 w-8 px-0 py-0 text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}
