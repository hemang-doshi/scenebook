"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageSquare, PlusCircle, LayoutGrid, List, Kanban } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";
import type { ProjectSummary } from "@/lib/data/repository";
import type { ContentFormat, ContentPlatform, ContentStatus } from "@/lib/types";
import { platformColors, formatColors, statusColors } from "@/lib/theme-utils";
import { cn } from "@/lib/utils";

const formats: ContentFormat[] = ["reel", "short", "tiktok", "carousel", "post", "vlog"];
const platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok", "linkedin", "x"];
const boardStatuses: ContentStatus[] = ["idea", "scripted", "ready_to_shoot", "shot", "editing", "posted", "analyzed"];

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

  useEffect(() => {
    queueMicrotask(() => {
      setIsCreateOpen(initialCreateOpen);
    });
  }, [initialCreateOpen]);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("short");
  const [platform, setPlatform] = useState<ContentPlatform>("youtube");
  const [activeView, setActiveView] = useState<"table" | "board" | "gallery">("table");

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
        setIsCreateOpen(false);
        setCreateError(null);
        router.push(`/projects/${project.id}`);
      } catch (caught) {
        setCreateError(caught instanceof Error ? caught.message : "Unable to create project.");
      }
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Project Hub"
          title="Projects"
          description="A customizable Notion-style database of your projects. Track and manage your production pipeline."
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
              <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-1">New Project</p>
              <h2 className="text-xl font-bold text-[var(--ink)]">Lightweight project setup</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Start with the essentials, then continue inside the full project workspace.
              </p>
            </div>
            <Button variant="ghost" className="h-9 px-3 text-xs" onClick={closeCreateForm}>
              Cancel
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label htmlFor="project-title" className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
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
              <label htmlFor="project-format" className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
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
              <label htmlFor="project-platform" className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
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

          <div className="flex justify-end pt-2 border-t border-[var(--hairline)]">
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

      <div className="space-y-4">
        {/* Notion-style database view tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--hairline)]">
          <button
            type="button"
            onClick={() => setActiveView("table")}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
              activeView === "table"
                ? "border-[var(--ink)] text-[var(--ink)] font-bold"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setActiveView("board")}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
              activeView === "board"
                ? "border-[var(--ink)] text-[var(--ink)] font-bold"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            <Kanban className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            type="button"
            onClick={() => setActiveView("gallery")}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
              activeView === "gallery"
                ? "border-[var(--ink)] text-[var(--ink)] font-bold"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Gallery
          </button>
        </div>

        {projects.length === 0 ? (
          <Panel className="py-16 text-center text-sm text-[var(--muted)]">
            No projects yet. Create the first one to open the project workspace flow.
          </Panel>
        ) : (
          <>
            {/* TABLE VIEW */}
            {activeView === "table" && (
              <Panel className="overflow-hidden p-0 border border-[var(--hairline)]">
                <div className="flex items-center justify-between border-b border-[var(--hairline)] p-6">
                  <div>
                    <h2 className="text-base font-bold text-[var(--ink)]">{projects.length} Projects</h2>
                  </div>
                  <Badge className="bg-[var(--surface-soft)] text-[var(--ink)] border border-[var(--hairline)]">
                    {readyToShootCount} ready to shoot
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--hairline)] bg-[var(--surface-soft)]">
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Project</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Status</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Format</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Platform</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Assets</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Updated</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[var(--ink)] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.id} className="border-b border-[var(--hairline)] hover:bg-[var(--surface-soft)]/40 transition-colors last:border-b-0">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-[var(--ink)]">{project.title}</p>
                              <p className="text-xs text-[var(--muted)] mt-0.5">Project workspace</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-2 py-0.5 rounded-[var(--rounded-sm)] text-[11px] font-semibold font-mono tracking-wider border"
                              style={{
                                backgroundColor: statusColors[project.status]?.bg ?? "#f0eeec",
                                color: statusColors[project.status]?.text ?? "#5d5b54",
                                borderColor: statusColors[project.status]?.border ?? "var(--hairline)",
                              }}
                            >
                              {statusLabels[project.status]?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-2 py-0.5 rounded-[var(--rounded-sm)] text-[11px] font-semibold font-mono tracking-wider border"
                              style={{
                                backgroundColor: formatColors[project.format]?.bg ?? "#f0eeec",
                                color: formatColors[project.format]?.text ?? "#5d5b54",
                                borderColor: formatColors[project.format]?.border ?? "var(--hairline)",
                              }}
                            >
                              {project.format.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-2 py-0.5 rounded-[var(--rounded-sm)] text-[11px] font-semibold font-mono tracking-wider border"
                              style={{
                                backgroundColor: platformColors[project.platform]?.bg ?? "#f0eeec",
                                color: platformColors[project.platform]?.text ?? "#5d5b54",
                                borderColor: platformColors[project.platform]?.border ?? "var(--hairline)",
                              }}
                            >
                              {project.platform.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[var(--ink)]">{project.assetCount}</td>
                          <td className="px-6 py-4 text-[var(--muted)]">{formatDate(project.updatedAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <Link href={`/projects/${project.id}`}>
                                <Button variant="secondary" className="h-8 px-3 text-xs">
                                  Workspace
                                </Button>
                              </Link>
                              <Link href={`/projects/${project.id}/chat`}>
                                <Button variant="secondary" className="h-8 px-3 text-xs">
                                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                  Chat
                                </Button>
                              </Link>
                              <Link href={`/editor/${project.id}`}>
                                <Button variant="primary" className="h-8 px-3 text-xs">
                                  Editor
                                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {/* BOARD VIEW */}
            {activeView === "board" && (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin h-[500px]">
                {boardStatuses.map((status) => {
                  const statusCards = projects.filter((p) => p.status === status);
                  return (
                    <div
                      key={status}
                      className="flex flex-col w-[280px] min-w-[280px] rounded-lg border border-[var(--hairline)] bg-[var(--surface-soft)]/50 p-3 h-full overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 mb-3">
                        <span
                          className="px-2 py-0.5 rounded-[var(--rounded-sm)] text-[10px] font-semibold font-mono tracking-wider border uppercase"
                          style={{
                            backgroundColor: statusColors[status]?.bg ?? "#f0eeec",
                            color: statusColors[status]?.text ?? "#5d5b54",
                            borderColor: statusColors[status]?.border ?? "var(--hairline)",
                          }}
                        >
                          {statusLabels[status]}
                        </span>
                        <span className="text-xs text-[var(--muted)] font-mono">{statusCards.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                        {statusCards.map((project) => (
                          <div
                            key={project.id}
                            className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-lg p-4 shadow-sm space-y-3 hover:border-[var(--ink)] transition-colors"
                          >
                            <div className="border-l-2 pl-2" style={{ borderColor: platformColors[project.platform]?.text ?? "var(--primary)" }}>
                              <h4 className="text-sm font-semibold text-[var(--ink)] leading-snug">{project.title}</h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <span
                                className="px-1.5 py-0.2 rounded-[var(--rounded-sm)] text-[9px] font-semibold font-mono border"
                                style={{
                                  backgroundColor: platformColors[project.platform]?.bg ?? "#f0eeec",
                                  color: platformColors[project.platform]?.text ?? "#5d5b54",
                                  borderColor: platformColors[project.platform]?.border ?? "var(--hairline)",
                                }}
                              >
                                {project.platform.toUpperCase()}
                              </span>
                              <span
                                className="px-1.5 py-0.2 rounded-[var(--rounded-sm)] text-[9px] font-semibold font-mono border"
                                style={{
                                  backgroundColor: formatColors[project.format]?.bg ?? "#f0eeec",
                                  color: formatColors[project.format]?.text ?? "#5d5b54",
                                  borderColor: formatColors[project.format]?.border ?? "var(--hairline)",
                                }}
                              >
                                {project.format.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
                              <span>Assets: {project.assetCount}</span>
                              <span>{formatDate(project.updatedAt)}</span>
                            </div>
                            <div className="pt-2 border-t border-[var(--hairline)] flex gap-1.5">
                              <Link href={`/projects/${project.id}`} className="flex-1">
                                <Button variant="secondary" className="w-full h-7 px-2 text-[10px]">
                                  Workspace
                                </Button>
                              </Link>
                              <Link href={`/editor/${project.id}`} className="flex-1">
                                <Button variant="primary" className="w-full h-7 px-2 text-[10px]">
                                  Editor
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                        {statusCards.length === 0 && (
                          <div className="text-center py-8 text-xs text-[var(--muted)] border border-dashed border-[var(--hairline)] rounded-lg">
                            No projects here
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* GALLERY VIEW */}
            {activeView === "gallery" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-lg overflow-hidden flex flex-col shadow-sm hover:border-[var(--ink)] transition-colors group"
                  >
                    {/* Top cover banner strip representing status or platform */}
                    <div
                      className="h-16 w-full border-b border-[var(--hairline)] flex items-end p-3"
                      style={{
                        backgroundColor: platformColors[project.platform]?.bg ?? "var(--surface-soft)",
                      }}
                    >
                      <span
                        className="px-2 py-0.5 rounded-[var(--rounded-sm)] text-[9px] font-semibold font-mono tracking-wider border bg-[var(--canvas)]"
                        style={{
                          color: platformColors[project.platform]?.text ?? "#5d5b54",
                          borderColor: platformColors[project.platform]?.border ?? "var(--hairline)",
                        }}
                      >
                        {project.platform.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-[var(--ink)] leading-snug group-hover:text-[var(--primary)] transition-colors">
                          {project.title}
                        </h4>
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span
                            className="px-1.5 py-0.2 rounded-[var(--rounded-sm)] text-[9px] font-semibold font-mono border"
                            style={{
                              backgroundColor: statusColors[project.status]?.bg ?? "#f0eeec",
                              color: statusColors[project.status]?.text ?? "#5d5b54",
                              borderColor: statusColors[project.status]?.border ?? "var(--hairline)",
                            }}
                          >
                            {statusLabels[project.status]?.toUpperCase()}
                          </span>
                          <span
                            className="px-1.5 py-0.2 rounded-[var(--rounded-sm)] text-[9px] font-semibold font-mono border"
                            style={{
                              backgroundColor: formatColors[project.format]?.bg ?? "#f0eeec",
                              color: formatColors[project.format]?.text ?? "#5d5b54",
                              borderColor: formatColors[project.format]?.border ?? "var(--hairline)",
                            }}
                          >
                            {project.format.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--hairline)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
                        <span>Assets: {project.assetCount}</span>
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Link href={`/projects/${project.id}`} className="flex-1">
                          <Button variant="secondary" className="w-full h-8 text-[10px]">
                            Workspace
                          </Button>
                        </Link>
                        <Link href={`/projects/${project.id}/chat`} className="flex-1">
                          <Button variant="secondary" className="w-full h-8 text-[10px]">
                            Chat
                          </Button>
                        </Link>
                        <Link href={`/editor/${project.id}`} className="flex-1">
                          <Button variant="primary" className="w-full h-8 text-[10px]">
                            Editor
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
