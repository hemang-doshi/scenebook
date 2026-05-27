"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Clapperboard,
  Film,
  FolderOpen,
  Loader2,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CreatorProgress } from "@/components/workspace/creator-progress";
import { useProjectWorkspace } from "@/components/workspace/hooks";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";

type AgentHistoryResponse = {
  threadId: string | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at?: string;
  }>;
  toolCalls: Array<{
    id: string;
    tool_name: string;
    command?: string | null;
    status: string;
    created_at?: string;
  }>;
};

type ActivityEntry =
  | {
      id: string;
      type: "message";
      label: string;
      detail: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "tool";
      label: string;
      detail: string;
      createdAt: string;
    };

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function createActivityEntries(history: AgentHistoryResponse): ActivityEntry[] {
  const messages = history.messages.map((message) => ({
    id: message.id,
    type: "message" as const,
    label: message.role === "assistant" ? "Agent reply" : message.role === "user" ? "Prompt" : "System",
    detail: message.content.trim(),
    createdAt: message.created_at ?? new Date().toISOString(),
  }));
  const tools = history.toolCalls.map((toolCall) => ({
    id: toolCall.id,
    type: "tool" as const,
    label: toolCall.command ? `/${toolCall.command}` : toolCall.tool_name,
    detail: `${toolCall.tool_name} · ${toolCall.status.toLowerCase()}`,
    createdAt: toolCall.created_at ?? new Date().toISOString(),
  }));

  return [...messages, ...tools]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
}

function buildNextActions(project: ProjectWorkspace, assetCount: number) {
  const suggestions: Array<{ title: string; command: string; detail: string }> = [];
  const hasScript = Boolean(project.scriptLab.script.trim() || project.scriptLab.caption.trim() || project.scriptLab.hook.trim());
  const hasTimeline = ["editing", "posting", "posted", "analyzed", "archived"].includes(project.status);
  const isPosted = project.status === "posted" || project.status === "analyzed";

  if (!hasScript) {
    suggestions.push({
      title: "Draft the first script pass",
      command: "/script",
      detail: "Use Agent to lock the hook, script, caption, and CTA.",
    });
  }

  if (assetCount === 0) {
    suggestions.push({
      title: "Build the generation brief",
      command: "/form-json-prompt",
      detail: "Generate the structured prompt bundle before producing assets.",
    });
  }

  if (!hasTimeline) {
    suggestions.push({
      title: "Prepare the editor handoff",
      command: "/import-to-editor",
      detail: "Use Agent to package the project into an editor-ready rough cut.",
    });
  }

  if (isPosted) {
    suggestions.push({
      title: "Close the learning loop",
      command: "/analyze",
      detail: "Reflect on results and decide the next experiment.",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Keep momentum in Agent",
      command: "/storyboard",
      detail: "Ask for the next concrete production step from the hub.",
    });
  }

  return suggestions;
}

function OverviewCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={`rounded-[1.75rem] border border-border/70 bg-black/20 p-5 ${className}`}>
      {eyebrow ? <p className="cmd-label text-accent">{eyebrow}</p> : null}
      <h2 className="mt-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

export default function ProjectHubPage() {
  const params = useParams<{ id: string }>();
  const { project, error, isLoading } = useProjectWorkspace(params.id);
  const [assetLibrary, setAssetLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      setIsLoadingAssets(true);
      try {
        const library = await fetchJson<ProjectAssetLibrary>(`/api/projects/${params.id}/assets`);
        if (active) {
          setAssetLibrary(library);
          setAssetError(null);
        }
      } catch (caught) {
        if (active) {
          setAssetLibrary(null);
          setAssetError(caught instanceof Error ? caught.message : "Unable to load asset library.");
        }
      } finally {
        if (active) {
          setIsLoadingAssets(false);
        }
      }
    }

    async function loadHistory() {
      try {
        const history = await fetchJson<AgentHistoryResponse>(`/api/projects/${params.id}/agent`);
        if (active) {
          setActivity(createActivityEntries(history));
        }
      } catch {
        if (active) {
          setActivity([]);
        }
      }
    }

    void loadAssets();
    void loadHistory();

    return () => {
      active = false;
    };
  }, [params.id]);

  const assetCount = useMemo(() => {
    if (assetLibrary) {
      return (
        assetLibrary.looseAssets.length +
        assetLibrary.folders.reduce((total, folder) => total + folder.assets.length, 0)
      );
    }

    return project?.assets.length ?? 0;
  }, [assetLibrary, project]);

  const generatedAssets = useMemo(
    () =>
      project?.assets.filter((asset) => asset.source === "generated").slice(0, 3) ??
      [],
    [project],
  );

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </Panel>
    );
  }

  if (error || !project) {
    return <Panel>{error ?? "Unable to load project."}</Panel>;
  }

  const scriptPreview = project.scriptLab.script.trim() || project.scriptLab.caption.trim() || project.scriptLab.hook.trim();
  const publishingState = project.analyticsJournal.permalink
    ? "Published"
    : project.analyticsJournal.instagramContainerId
      ? "Processing on Instagram"
      : project.analyticsJournal.instagramAccountId
        ? "Ready to publish"
        : "Not connected";
  const nextActions = buildNextActions(project, assetCount);
  const lastActivity = activity[0];

  return (
    <div className="space-y-6 pb-10">
      <Panel className="rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(212,255,51,0.14),transparent_28%),rgba(9,9,11,0.78)] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="cmd-label text-accent">Project hub</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{project.title}</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Use this page as the overview layer. Agent owns generation and planning, editor owns the rough cut, and analytics stays one click away.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border-accent/20 bg-accent/10 text-accent">{project.status.replaceAll("_", " ")}</Badge>
              <Badge className="border-border/70 bg-black/20 text-muted">{project.format}</Badge>
              <Badge className="border-border/70 bg-black/20 text-muted">{project.platform}</Badge>
              <Badge className="border-border/70 bg-black/20 text-muted">Updated {formatDate(project.updatedAt)}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/projects/${project.id}/chat`}>
              <Button className="rounded-full px-4">
                Open Agent
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/editor/${project.id}`}>
              <Button variant="secondary" className="rounded-full px-4">
                Open Editor
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary" className="rounded-full px-4">
                View Analytics
              </Button>
            </Link>
          </div>
        </div>
      </Panel>

      <CreatorProgress currentStatus={project.status} cardId={project.id} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <OverviewCard title="Continue in Agent" eyebrow="Primary CTA">
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {lastActivity
                ? `${lastActivity.label}: ${lastActivity.detail}`
                : "No agent run yet. Start in Agent for scripts, structured prompts, tasks, generation, or analysis."}
            </p>
            <div className="flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-black/25 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Real work now happens in Agent</p>
                  <p className="text-xs text-muted">Use slash commands there instead of jumping between old workspace tabs.</p>
                </div>
              </div>
              <Link href={`/projects/${project.id}/chat`}>
                <Button className="rounded-full px-4">Open Agent</Button>
              </Link>
            </div>
          </div>
        </OverviewCard>

        <OverviewCard title="Project summary" eyebrow="Overview">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="cmd-label">Script</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{scriptPreview ? "Ready to refine" : "Not started"}</p>
              <p className="mt-2 text-sm text-muted">
                {scriptPreview ? "There is already a draft hook or script to continue from." : "Kick this off in Agent with `/script`."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="cmd-label">Assets</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{assetCount}</p>
              <p className="mt-2 text-sm text-muted">
                {assetLibrary ? `${assetLibrary.folders.length} folders tracked through the asset library.` : "Assets and folders will appear here once loaded."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="cmd-label">Editor</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{["editing", "posting", "posted", "analyzed", "archived"].includes(project.status) ? "In progress" : "Not started"}</p>
              <p className="mt-2 text-sm text-muted">Continue the rough cut in the standalone editor.</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="cmd-label">Publishing</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{publishingState}</p>
              <p className="mt-2 text-sm text-muted">
                {project.analyticsJournal.permalink ? "The Instagram permalink is already attached." : "Publishing status is derived from the existing Instagram integration state."}
              </p>
            </div>
          </div>
        </OverviewCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <OverviewCard title="Latest script / caption preview" eyebrow="Script">
          <p className="text-sm leading-6 text-muted">
            {scriptPreview || "No script or caption preview yet. Use `/script` in Agent to draft the first pass."}
          </p>
          {project.scriptLab.caption.trim() ? (
            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="cmd-label">Caption</p>
              <p className="mt-2 text-sm text-foreground">{project.scriptLab.caption}</p>
            </div>
          ) : null}
        </OverviewCard>

        <OverviewCard title="Generated Assets" eyebrow="Asset API">
          {isLoadingAssets ? (
            <p className="text-sm text-muted">Loading asset library…</p>
          ) : assetError ? (
            <p className="text-sm text-muted">{assetError}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-black/25 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{assetLibrary?.folders.length ?? 0} folders</p>
                    <p className="text-xs text-muted">{assetCount} assets tracked</p>
                  </div>
                </div>
                <Link href={`/projects/${project.id}/chat`}>
                  <Button variant="ghost" className="h-8 rounded-full px-3 text-[10px]">Use Agent</Button>
                </Link>
              </div>
              {generatedAssets.length > 0 ? (
                <div className="grid gap-3">
                  {generatedAssets.map((asset) => (
                    <div key={asset.id} className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
                      <p className="text-sm font-medium text-foreground">{asset.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted">{asset.type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No generated assets yet. Start with `/form-json-prompt` or `/generate` in Agent.</p>
              )}
            </div>
          )}
        </OverviewCard>

        <OverviewCard title="Editor Rough Cut" eyebrow="Editor">
          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <Film className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">Timeline status</p>
                  <p className="text-xs text-muted">
                    {["editing", "posting", "posted", "analyzed", "archived"].includes(project.status)
                      ? "Project is already in the editing or delivery phase."
                      : "No synced timeline status is available yet."}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-black/15 p-4 text-sm text-muted">
              Export state is not surfaced here yet, so this stays as an empty rough-cut handoff until the editor exposes timeline metadata.
            </div>
            <Link href={`/editor/${project.id}`}>
              <Button variant="secondary" className="rounded-full px-4">Open Editor</Button>
            </Link>
          </div>
        </OverviewCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <OverviewCard title="Instagram Publishing" eyebrow="Delivery">
          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <InstagramIcon className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">{publishingState}</p>
                  <p className="text-xs text-muted">
                    {project.analyticsJournal.instagramAccountId
                      ? "Instagram account is already associated with this project."
                      : "No connected Instagram publishing account is attached yet."}
                  </p>
                </div>
              </div>
            </div>
            {project.analyticsJournal.permalink ? (
              <a
                href={project.analyticsJournal.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
              >
                View live post
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link href="/settings">
                <Button variant="secondary" className="rounded-full px-4">Open Settings</Button>
              </Link>
            )}
          </div>
        </OverviewCard>

        <OverviewCard title="Analytics reflection preview" eyebrow="Learning">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted">
              {project.analyticsJournal.reflection.trim() || "No reflection captured yet. When the post is live, use `/analyze` from Agent or review the analytics page."}
            </p>
            {project.analyticsJournal.followUpIdea.trim() ? (
              <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
                <p className="cmd-label">Follow-up idea</p>
                <p className="mt-2 text-sm text-foreground">{project.analyticsJournal.followUpIdea}</p>
              </div>
            ) : null}
          </div>
        </OverviewCard>

        <OverviewCard title="Recent agent activity" eyebrow="Thread">
          {activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((entry) => (
                <div key={entry.id} className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                    <span className="text-[11px] text-muted">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{entry.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No agent activity yet. Open Agent to start the working session for this project.</p>
          )}
        </OverviewCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <OverviewCard title="Next Best Actions" eyebrow="Static rules">
          <div className="space-y-3">
            {nextActions.map((action) => (
              <div key={action.command} className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="mt-1 text-sm text-muted">{action.detail}</p>
                </div>
                <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                  {action.command}
                </span>
              </div>
            ))}
          </div>
        </OverviewCard>

        <OverviewCard title="Hub direction" eyebrow="Flow">
          <div className="space-y-4 text-sm text-muted">
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                Agent handles script, prompt, generation, tasks, and analysis commands.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="flex items-center gap-2 text-foreground">
                <Clapperboard className="h-4 w-4 text-accent" />
                Editor owns the rough cut and export work once assets are ready.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-black/25 p-4">
              <p className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-4 w-4 text-accent" />
                Analytics remains a separate page and is intentionally not redesigned in this pass.
              </p>
            </div>
          </div>
        </OverviewCard>
      </div>
    </div>
  );
}
