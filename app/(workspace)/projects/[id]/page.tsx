/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle,
  Clapperboard,
  Clock,
  Film,
  FolderOpen,
  Layers,
  Loader2,
  Monitor,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/custom-select";
import { CreatorProgress } from "@/components/workspace/creator-progress";
import { useProjectWorkspace } from "@/components/workspace/hooks";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import { statusLabels } from "@/lib/domain/content";
import { fetchJson } from "@/lib/fetcher";
import type { ContentFormat, ContentPlatform, ContentStatus, ScriptLab } from "@/lib/types";

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

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

const formats: ContentFormat[] = ["reel", "short", "tiktok", "carousel", "post", "vlog"];
const platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok", "linkedin", "x"];
const statuses: ContentStatus[] = ["idea", "scripted", "ready_to_shoot", "shot", "editing", "posted", "analyzed", "archived"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
    detail: `${toolCall.tool_name} | ${toolCall.status.toLowerCase()}`,
    createdAt: toolCall.created_at ?? new Date().toISOString(),
  }));

  return [...messages, ...tools]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);
}

function doneCount(items: Array<{ done: boolean }>) {
  return items.filter((item) => item.done).length;
}

export default function ProjectHubPage() {
  const params = useParams<{ id: string }>();
  const { project, error, isLoading, refresh, setProject } = useProjectWorkspace(params.id);
  const [assetLibrary, setAssetLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const [hookVal, setHookVal] = useState("");
  const [scriptVal, setScriptVal] = useState("");
  const [captionVal, setCaptionVal] = useState("");
  const [ctaVal, setCtaVal] = useState("");
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [saveMessage, setSaveMessage] = useState("All changes saved");

  const [newRollTask, setNewRollTask] = useState("");

  useEffect(() => {
    if (project) {
      setHookVal(project.scriptLab.hook || "");
      setScriptVal(project.scriptLab.script || "");
      setCaptionVal(project.scriptLab.caption || "");
      setCtaVal(project.scriptLab.cta || "");
    }
  }, [project]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ink)]" />
      </div>
    );
  }

  if (error || !project) {
    return <Panel className="mx-auto mt-8 max-w-4xl">{error ?? "Unable to load project."}</Panel>;
  }

  const generatedAssets = assetLibrary
    ? [...assetLibrary.looseAssets, ...assetLibrary.folders.flatMap((folder) => folder.assets)].slice(0, 4)
    : project.assets.slice(0, 4);

  const lastActivity = activity[0];
  const allChecklistItems = [
    ...(project.shootPack.aRoll || []),
    ...(project.shootPack.bRoll || []),
    ...(project.shootPack.screenCaptures || []),
    ...(project.shootPack.props || []),
  ];
  const checklistDone = doneCount(allChecklistItems);
  const scriptFieldsReady = [project.scriptLab.hook, project.scriptLab.script, project.scriptLab.caption, project.scriptLab.cta].filter((value) =>
    value.trim(),
  ).length;
  const nextAction =
    project.status === "idea" || project.status === "scripted"
      ? {
          title: "Continue with Agent",
          detail: "Let SceneBook turn this brief into a production package before editing.",
        }
      : project.status === "ready_to_shoot" || project.status === "shot"
        ? {
            title: "Open the Project Hub",
            detail: "Confirm shoot readiness and assets before moving into the editor.",
          }
        : project.status === "editing"
          ? {
              title: "Open Editor",
              detail: "Cut the reel with the latest script and asset context.",
            }
          : {
              title: "Review Analytics",
              detail: "Capture the learning loop and plan the next iteration.",
            };

  async function handlePropertyChange(field: "status" | "format" | "platform", value: string) {
    if (!project) return;
    const nextProject = {
      ...project,
      [field]: value,
    };
    setProject(nextProject);

    try {
      await fetchJson(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          [field]: value,
        }),
      });
      refresh();
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
      refresh();
    }
  }

  async function handleScriptBlur(field: keyof ScriptLab, value: string) {
    if (!project) return;
    if ((project.scriptLab[field] || "") === value) return;

    setIsSavingScript(true);
    setSaveMessage("Saving...");

    try {
      const nextProject = {
        ...project,
        scriptLab: {
          ...project.scriptLab,
          [field]: value,
        },
      };
      setProject(nextProject);

      await fetchJson(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          scriptLab: {
            [field]: value,
          },
        }),
      });
      setSaveMessage("All changes saved");
    } catch (err) {
      console.error("Failed to save script field:", err);
      setSaveMessage("Error saving changes");
      refresh();
    } finally {
      setIsSavingScript(false);
    }
  }

  async function toggleTask(taskId: string, type: "aRoll" | "bRoll") {
    if (!project) return;
    const currentList = project.shootPack[type] || [];
    const updatedList = currentList.map((item) =>
      item.id === taskId ? { ...item, done: !item.done } : item
    );

    const nextProject = {
      ...project,
      shootPack: {
        ...project.shootPack,
        [type]: updatedList,
      },
    };
    setProject(nextProject);

    try {
      await fetchJson(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          shootPack: {
            [type]: updatedList,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to update task status:", err);
      refresh();
    }
  }

  async function addTask(type: "aRoll" | "bRoll", label: string) {
    if (!project || !label.trim()) return;
    const currentList = project.shootPack[type] || [];
    const newTask = {
      id: `task-${Date.now()}`,
      label: label.trim(),
      done: false,
    };
    const updatedList = [...currentList, newTask];

    const nextProject = {
      ...project,
      shootPack: {
        ...project.shootPack,
        [type]: updatedList,
      },
    };
    setProject(nextProject);

    try {
      await fetchJson(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          shootPack: {
            [type]: updatedList,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to add task:", err);
      refresh();
    }
  }

  async function deleteTask(taskId: string, type: "aRoll" | "bRoll") {
    if (!project) return;
    const currentList = project.shootPack[type] || [];
    const updatedList = currentList.filter((item) => item.id !== taskId);

    const nextProject = {
      ...project,
      shootPack: {
        ...project.shootPack,
        [type]: updatedList,
      },
    };
    setProject(nextProject);

    try {
      await fetchJson(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          shootPack: {
            [type]: updatedList,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to delete task:", err);
      refresh();
    }
  }

  return (
    <div className="mx-auto max-w-[var(--container)] space-y-8 px-4 py-6 pb-20 md:px-6">
      <Panel className="overflow-hidden p-0" role="region" aria-label="Project Hub hero">
        <div className="sb-gradient-thumbnail h-24 w-full opacity-85" />
        <div className="space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="runtime">Project Hub</Badge>
                <Badge variant={statusBadgeVariant(project.status)}>{statusLabels[project.status]}</Badge>
                <Badge variant={formatBadgeVariant(project.format)}>{project.format.toUpperCase()}</Badge>
                <Badge variant="muted">{project.platform.toUpperCase()}</Badge>
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-normal text-[var(--ink)] md:text-4xl">
                  {project.title}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">Updated {formatDate(project.updatedAt)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/chat`}>
                <Button variant="primary" className="h-10 px-4 text-xs">
                  <Bot className="mr-1.5 h-3.5 w-3.5" />
                  Agent
                </Button>
              </Link>
              <Link href={`/editor/${project.id}`}>
                <Button variant="secondary" className="h-10 px-4 text-xs">
                  <Film className="mr-1.5 h-3.5 w-3.5" />
                  Open Editor
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="secondary" className="h-10 px-4 text-xs">
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-5 text-xs md:grid-cols-4">
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <Layers className="h-3.5 w-3.5" /> Status
              </span>
              <CustomSelect
                value={project.status}
                onChange={(val) => handlePropertyChange("status", val)}
                options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))}
                triggerClassName="h-8 text-xs bg-[var(--canvas)] border-[var(--hairline)]"
              />
            </div>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <Monitor className="h-3.5 w-3.5" /> Platform
              </span>
              <CustomSelect
                value={project.platform}
                onChange={(val) => handlePropertyChange("platform", val)}
                options={platforms.map((platform) => ({ value: platform, label: platform.toUpperCase() }))}
                triggerClassName="h-8 text-xs bg-[var(--canvas)] border-[var(--hairline)]"
              />
            </div>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <Film className="h-3.5 w-3.5" /> Format
              </span>
              <CustomSelect
                value={project.format}
                onChange={(val) => handlePropertyChange("format", val)}
                options={formats.map((format) => ({ value: format, label: format.toUpperCase() }))}
                triggerClassName="h-8 text-xs bg-[var(--canvas)] border-[var(--hairline)]"
              />
            </div>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <Clock className="h-3.5 w-3.5" /> Stage signal
              </span>
              <div className="flex h-8 items-center font-mono text-[var(--ink)]">{project.readiness.label}</div>
            </div>
          </div>
        </div>
      </Panel>

      <CreatorProgress currentStatus={project.status} cardId={project.id} />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Panel variant="floating" className="space-y-4 p-6 shadow-none">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 text-[var(--blue-2)]" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Next recommended action</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-[var(--ink)]">{nextAction.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{nextAction.detail}</p>
              </div>
            </div>
              <Link href={`/projects/${project.id}/chat`}>
                <Button variant="runtime" className="h-10 px-4 text-xs">
                  <Bot className="mr-1.5 h-3.5 w-3.5" />
                  Agent
                </Button>
              </Link>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Script status</p>
              <p className="mt-2 font-display text-2xl font-bold text-[var(--ink)]">{scriptFieldsReady}/4</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Hook, script, caption, and CTA fields filled.</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Shoot checklist readiness</p>
              <p className="mt-2 font-display text-2xl font-bold text-[var(--ink)]">{checklistDone}/{allChecklistItems.length}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Production tasks checked off.</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Asset readiness</p>
              <p className="mt-2 font-display text-2xl font-bold text-[var(--ink)]">{assetCount}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Generated and attached assets available.</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Editor readiness</p>
              <p className="mt-2 font-display text-2xl font-bold text-[var(--ink)]">
                {scriptFieldsReady >= 2 && assetCount > 0 ? "Ready" : "Prep needed"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Editor stays secondary until the package is stronger.</p>
            </Card>
          </div>

          <Panel className="space-y-5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--ink)]">ProjectMind / Brief</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">The working creative memory for this reel.</p>
              </div>
              <Badge variant="creative">Brief</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Hook</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{project.scriptLab.hook || "No hook captured yet."}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Angle</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{project.scriptLab.angle || "No angle captured yet."}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] p-4 md:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Current goal</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
                  {project.scriptLab.cta || project.scriptLab.notes || "Use the Agent to clarify the production goal."}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--ink)]">Editable Workbench</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">Script changes autosave on blur.</p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted)]">
                {isSavingScript ? <Loader2 className="h-3 w-3 animate-spin text-[var(--ink)]" /> : null}
                <span>{saveMessage}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="script-hook" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Hook
                </label>
                <Input
                  id="script-hook"
                  value={hookVal}
                  onChange={(event) => setHookVal(event.target.value)}
                  onBlur={(event) => handleScriptBlur("hook", event.target.value)}
                  placeholder="Draft a catchy hook line..."
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="script-body" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Script Content
                </label>
                <Textarea
                  id="script-body"
                  value={scriptVal}
                  onChange={(event) => setScriptVal(event.target.value)}
                  onBlur={(event) => handleScriptBlur("script", event.target.value)}
                  placeholder="Write the full voiceover script..."
                  className="min-h-[160px]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="script-caption" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Caption copy
                  </label>
                  <Textarea
                    id="script-caption"
                    value={captionVal}
                    onChange={(event) => setCaptionVal(event.target.value)}
                    onBlur={(event) => handleScriptBlur("caption", event.target.value)}
                    placeholder="Instagram caption copy with hashtags..."
                    className="min-h-[96px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="script-cta" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Call to Action (CTA)
                  </label>
                  <Input
                    id="script-cta"
                    value={ctaVal}
                    onChange={(event) => setCtaVal(event.target.value)}
                    onBlur={(event) => handleScriptBlur("cta", event.target.value)}
                    placeholder="Comment below or tap link..."
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-5 p-6" role="region" aria-label="Shoot checklist readiness">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--ink)]">Shoot checklist readiness</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">Toggle, add, and remove A-roll tasks inline.</p>
              </div>
              <Badge variant="warning">{checklistDone}/{allChecklistItems.length} done</Badge>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <CheckCircle className="h-3.5 w-3.5" /> A-Roll Deliverables
              </h3>

              <div className="space-y-2">
                {(project.shootPack.aRoll || []).map((task) => (
                  <div key={task.id} className="group flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--panel-2)_60%,transparent)]">
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-xs">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id, "aRoll")}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--hairline)] accent-[var(--blue)]"
                      />
                      <span className={task.done ? "text-[var(--muted)] line-through" : "font-medium text-[var(--ink)]"}>
                        {task.label}
                      </span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Delete ${task.label}`}
                      onClick={() => deleteTask(task.id, "aRoll")}
                      className="rounded p-0.5 text-[var(--muted)] opacity-100 transition-colors hover:text-[var(--danger)] md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newRollTask}
                    onChange={(event) => setNewRollTask(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newRollTask.trim()) {
                        addTask("aRoll", newRollTask);
                        setNewRollTask("");
                      }
                    }}
                    placeholder="+ Add inline task (press Enter)"
                    className="h-9 text-xs"
                  />
                  {newRollTask.trim() ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        addTask("aRoll", newRollTask);
                        setNewRollTask("");
                      }}
                      className="h-9 px-3 text-[10px]"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel variant="floating" className="space-y-4 p-6 shadow-none">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--blue-2)]" />
              <h2 className="font-display text-xl font-bold text-[var(--ink)]">Recent Agent Output</h2>
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {lastActivity
                ? `${lastActivity.label}: ${lastActivity.detail}`
                : "No active threads yet. Launch the Agent to generate briefs, outlines, or production packages."}
            </p>
            <Link href={`/projects/${project.id}/chat`}>
              <Button variant="runtime" className="w-full h-9 text-[11px]">
                <Bot className="mr-1.5 h-3.5 w-3.5" /> Agent
              </Button>
            </Link>
          </Panel>

          <Panel className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[var(--ink)]" />
                <h2 className="font-display text-xl font-bold text-[var(--ink)]">Assets Preview</h2>
              </div>
              <Badge variant="muted">{assetCount} assets</Badge>
            </div>

            {isLoadingAssets ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--ink)]" />
              </div>
            ) : assetError ? (
              <p className="text-xs text-[var(--muted)]">{assetError}</p>
            ) : generatedAssets.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {generatedAssets.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)]">
                    <div className="flex aspect-video items-center justify-center overflow-hidden bg-[color-mix(in_srgb,var(--panel-2)_72%,transparent)]">
                      {asset.url && asset.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.url} alt={asset.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="font-mono text-[10px] uppercase text-[var(--muted)]">{asset.type}</div>
                      )}
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="truncate text-[10px] font-semibold text-[var(--ink)]" title={asset.title}>
                        {asset.title}
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-wider text-[var(--muted)]">
                        {asset.source || "Generated"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--line)] py-4 text-center text-xs text-[var(--muted)]">
                No assets generated. Run the Agent to produce media prompts and source files.
              </p>
            )}
          </Panel>

          <Panel className="space-y-4 p-6">
            <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
              <Clapperboard className="h-4 w-4 text-[var(--ink)]" />
              <h2 className="font-display text-xl font-bold text-[var(--ink)]">Editor Readiness</h2>
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Editor remains available, but SceneBook should package the brief, script, shoot checklist, and assets first.
            </p>
            <Link href={`/editor/${project.id}`}>
              <Button variant="secondary" className="w-full h-9 text-[11px]">
                Open Editor
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </Panel>

          <Panel className="space-y-4 p-6">
            <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
              <BarChart3 className="h-4 w-4 text-[var(--ink)]" />
              <h2 className="font-display text-xl font-bold text-[var(--ink)]">Learning Loop</h2>
            </div>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {project.analyticsJournal.reflection.trim() || "No reflection captured yet. When the reel is live, use analytics to choose the next iteration."}
            </p>
            {project.analyticsJournal.followUpIdea.trim() ? (
              <div className="space-y-1 rounded-[var(--radius-md)] border border-[var(--line)] p-3">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">Follow-up Idea</span>
                <p className="text-xs leading-relaxed text-[var(--ink)]">{project.analyticsJournal.followUpIdea}</p>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
