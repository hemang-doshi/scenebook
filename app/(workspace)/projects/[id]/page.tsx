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
  Calendar,
  Layers,
  Monitor,
  CheckCircle,
  Clock,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CreatorProgress } from "@/components/workspace/creator-progress";
import { useProjectWorkspace } from "@/components/workspace/hooks";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";
import { platformColors, formatColors, statusColors } from "@/lib/theme-utils";
import type { ContentFormat, ContentPlatform, ContentStatus, ScriptLab } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";

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

const formats: ContentFormat[] = ["reel", "short", "tiktok", "carousel", "post", "vlog"];
const platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok", "linkedin", "x"];
const statuses: ContentStatus[] = ["idea", "scripted", "ready_to_shoot", "shot", "editing", "posted", "analyzed", "archived"];

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

export default function ProjectHubPage() {
  const params = useParams<{ id: string }>();
  const { project, error, isLoading, refresh, setProject } = useProjectWorkspace(params.id);
  const [assetLibrary, setAssetLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  // Local input states for inline Script Lab editing
  const [hookVal, setHookVal] = useState("");
  const [scriptVal, setScriptVal] = useState("");
  const [captionVal, setCaptionVal] = useState("");
  const [ctaVal, setCtaVal] = useState("");
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [saveMessage, setSaveMessage] = useState("All changes saved");

  // Local checklist input states
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
    return <Panel className="max-w-4xl mx-auto mt-8">{error ?? "Unable to load project."}</Panel>;
  }

  const generatedAssets = assetLibrary
    ? [...assetLibrary.looseAssets, ...assetLibrary.folders.flatMap((f) => f.assets)].slice(0, 4)
    : project.assets.slice(0, 4);

  const publishingState = project.analyticsJournal.permalink
    ? "Published"
    : project.analyticsJournal.instagramContainerId
      ? "Processing on Instagram"
      : project.analyticsJournal.instagramAccountId
        ? "Ready to publish"
        : "Not connected";

  const lastActivity = activity[0];

  // Property update helper
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

  // Script field save helper (triggered on blur)
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

  // Toggle checkbox helper
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

  // Add checkbox task helper
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

  // Delete checkbox task helper
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
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-20 space-y-8">
      
      {/* Notion Page Cover & Emoji Header */}
      <div className="relative border border-[var(--hairline)] rounded-lg overflow-hidden bg-[var(--canvas)]">
        <div className="h-40 w-full bg-gradient-to-r from-[var(--block-lilac)] via-[var(--block-mint)] to-[var(--block-coral)] opacity-85" />
        
        {/* Float emoji */}
        <div className="relative px-6 md:px-8 -mt-10 mb-4 z-10">
          <div className="text-4xl select-none bg-[var(--canvas)] border border-[var(--hairline)] rounded-xl w-16 h-16 flex items-center justify-center shadow-sm">
            {project.status === "posted" || project.status === "analyzed" ? "📊" : ["shot", "editing"].includes(project.status) ? "🎬" : "📝"}
          </div>
        </div>

        <div className="px-6 md:px-8 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--ink)]">{project.title}</h1>
            <p className="text-xs text-[var(--muted)]">Project Collaboration Page</p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href={`/projects/${project.id}/chat`}>
              <Button variant="primary" className="h-9 px-4 text-xs">
                Open Agent
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={`/editor/${project.id}`}>
              <Button variant="secondary" className="h-9 px-4 text-xs">
                Open Editor
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary" className="h-9 px-4 text-xs">
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Database property fields inline */}
        <div className="border-t border-[var(--hairline)] bg-[var(--surface-soft)]/50 px-6 md:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[var(--muted)] font-mono uppercase tracking-wider text-[10px]">
              <Layers className="h-3.5 w-3.5" /> Status
            </span>
            <CustomSelect
              value={project.status}
              onChange={(val) => handlePropertyChange("status", val)}
              options={statuses.map((s) => ({ value: s, label: statusLabels[s] }))}
              triggerClassName="h-7 text-xs bg-[var(--canvas)] border-[var(--hairline)]"
            />
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[var(--muted)] font-mono uppercase tracking-wider text-[10px]">
              <Monitor className="h-3.5 w-3.5" /> Platform
            </span>
            <CustomSelect
              value={project.platform}
              onChange={(val) => handlePropertyChange("platform", val)}
              options={platforms.map((p) => ({ value: p, label: p.toUpperCase() }))}
              triggerClassName="h-7 text-xs bg-[var(--canvas)] border-[var(--hairline)]"
            />
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[var(--muted)] font-mono uppercase tracking-wider text-[10px]">
              <Film className="h-3.5 w-3.5" /> Format
            </span>
            <CustomSelect
              value={project.format}
              onChange={(val) => handlePropertyChange("format", val)}
              options={formats.map((f) => ({ value: f, label: f.toUpperCase() }))}
              triggerClassName="h-7 text-xs bg-[var(--canvas)] border-[var(--hairline)]"
            />
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[var(--muted)] font-mono uppercase tracking-wider text-[10px]">
              <Calendar className="h-3.5 w-3.5" /> Last Updated
            </span>
            <div className="h-7 flex items-center pl-2 font-mono text-[var(--ink)] bg-transparent">
              {formatDate(project.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress pipeline */}
      <CreatorProgress currentStatus={project.status} cardId={project.id} />

      {/* Main split block */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        
        {/* Left Column: Script Lab & Checklist */}
        <div className="space-y-6">
          
          {/* Document Section: Interactive Script Lab */}
          <Panel className="border border-[var(--hairline)] bg-[var(--canvas)] p-6 space-y-6 relative">
            <div className="absolute top-6 right-6 flex items-center gap-1.5 text-[10px] font-mono text-[var(--muted)]">
              {isSavingScript && <Loader2 className="h-3 w-3 animate-spin text-[var(--ink)]" />}
              <span>{saveMessage}</span>
            </div>
            
            <div className="border-l-3 border-[var(--primary)] pl-3">
              <h2 className="text-base font-bold text-[var(--ink)]">Script Lab</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Click directly into any block to edit. Changes save automatically.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Hook</label>
                <input
                  value={hookVal}
                  onChange={(e) => setHookVal(e.target.value)}
                  onBlur={(e) => handleScriptBlur("hook", e.target.value)}
                  placeholder="Draft a catchy hook line..."
                  className="w-full bg-[var(--surface-soft)] border border-[var(--hairline)] hover:border-[var(--ink)] focus:border-[var(--ink)] rounded-md px-3 py-2 text-xs text-[var(--ink)] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Script Content</label>
                <textarea
                  value={scriptVal}
                  onChange={(e) => setScriptVal(e.target.value)}
                  onBlur={(e) => handleScriptBlur("script", e.target.value)}
                  placeholder="Write the full voiceover script..."
                  className="w-full min-h-[160px] bg-[var(--surface-soft)] border border-[var(--hairline)] hover:border-[var(--ink)] focus:border-[var(--ink)] rounded-md px-3 py-2 text-xs text-[var(--ink)] focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Caption copy</label>
                  <textarea
                    value={captionVal}
                    onChange={(e) => setCaptionVal(e.target.value)}
                    onBlur={(e) => handleScriptBlur("caption", e.target.value)}
                    placeholder="Instagram caption copy with hashtags..."
                    className="w-full min-h-[90px] bg-[var(--surface-soft)] border border-[var(--hairline)] hover:border-[var(--ink)] focus:border-[var(--ink)] rounded-md px-3 py-2 text-xs text-[var(--ink)] focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Call to Action (CTA)</label>
                  <input
                    value={ctaVal}
                    onChange={(e) => setCtaVal(e.target.value)}
                    onBlur={(e) => handleScriptBlur("cta", e.target.value)}
                    placeholder="Comment below or tap link..."
                    className="w-full bg-[var(--surface-soft)] border border-[var(--hairline)] hover:border-[var(--ink)] focus:border-[var(--ink)] rounded-md px-3 py-2 text-xs text-[var(--ink)] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Interactive Checklist Block */}
          <Panel className="border border-[var(--hairline)] bg-[var(--canvas)] p-6 space-y-6">
            <div className="border-l-3 border-[var(--block-coral)] pl-3">
              <h2 className="text-base font-bold text-[var(--ink)]">Shoot checklist</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Toggle checkboxes to check off tasks. Add items inline.</p>
            </div>

            <div className="space-y-6">
              {/* A-Roll Checklist */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> A-Roll Deliverables
                </h4>
                
                <div className="space-y-2">
                  {(project.shootPack.aRoll || []).map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 group px-2 py-1 rounded hover:bg-[var(--surface-soft)]/60 transition-colors">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs flex-1">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => toggleTask(task.id, "aRoll")}
                          className="h-3.5 w-3.5 rounded border-[var(--hairline)] accent-[var(--primary)] cursor-pointer"
                        />
                        <span className={task.done ? "line-through text-[var(--muted)]" : "text-[var(--ink)] font-medium"}>
                          {task.label}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id, "aRoll")}
                        className="text-[var(--muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Inline Add Task Input */}
                  <div className="flex gap-2 items-center pl-2 pt-1">
                    <input
                      value={newRollTask}
                      onChange={(e) => setNewRollTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newRollTask.trim()) {
                          addTask("aRoll", newRollTask);
                          setNewRollTask("");
                        }
                      }}
                      placeholder="+ Add inline task (press Enter)"
                      className="text-xs bg-transparent border-0 border-b border-transparent hover:border-[var(--hairline)] focus:border-[var(--ink)] focus:outline-none py-1 w-full max-w-sm transition-colors text-[var(--ink)] placeholder:text-[var(--muted)]/60"
                    />
                    {newRollTask.trim() && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          addTask("aRoll", newRollTask);
                          setNewRollTask("");
                        }}
                        className="h-7 px-2 text-[10px] flex items-center"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: Assets, Activities, Actions */}
        <div className="space-y-6">
          
          {/* Agent Activity Summary */}
          <Panel className="border border-[var(--hairline)] bg-[var(--surface-soft)]/50 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--ink)]" />
              <h3 className="font-bold text-sm text-[var(--ink)]">Agent Reflection</h3>
            </div>
            
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              {lastActivity
                ? `${lastActivity.label}: ${lastActivity.detail}`
                : "No active threads yet. Launch the Chat Agent to generate prompt briefs, outlines, or subtitle clips."}
            </p>
            
            <div className="pt-2">
              <Link href={`/projects/${project.id}/chat`}>
                <Button variant="secondary" className="w-full h-8 text-[11px] font-mono flex items-center justify-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" /> Continue in Agent
                </Button>
              </Link>
            </div>
          </Panel>

          {/* Database-style Asset Gallery */}
          <Panel className="border border-[var(--hairline)] bg-[var(--canvas)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[var(--ink)]" />
                <h3 className="font-bold text-sm text-[var(--ink)]">Asset Library</h3>
              </div>
              <Badge className="bg-[var(--surface-soft)] border border-[var(--hairline)] text-[var(--ink)] text-[10px]">
                {assetCount} assets
              </Badge>
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
                  <div
                    key={asset.id}
                    className="group border border-[var(--hairline)] rounded-lg overflow-hidden bg-[var(--surface-soft)]/20 hover:border-[var(--ink)] transition-colors flex flex-col justify-between"
                  >
                    {/* Media thumbnail preview */}
                    <div className="aspect-video bg-[var(--surface-soft)] border-b border-[var(--hairline)] flex items-center justify-center overflow-hidden">
                      {asset.url && asset.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.url} alt={asset.title} className="object-cover w-full h-full" />
                      ) : (
                        <div className="text-[10px] font-mono text-[var(--muted)] capitalize">{asset.type}</div>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] font-semibold text-[var(--ink)] truncate" title={asset.title}>
                        {asset.title}
                      </p>
                      <p className="text-[8px] text-[var(--muted)] font-mono uppercase tracking-wider">{asset.source || "Generated"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] py-4 text-center border border-dashed border-[var(--hairline)] rounded-lg">
                No assets generated. Run `/form-json-prompt` inside the Chat Agent to produce media.
              </p>
            )}

            <div className="pt-2">
              <Link href={`/projects/${project.id}/chat`}>
                <Button variant="secondary" className="w-full h-8 text-[11px] font-mono">
                  Manage Assets
                </Button>
              </Link>
            </div>
          </Panel>

          {/* Delivery & Instagram Publishing */}
          <Panel className="border border-[var(--hairline)] bg-[var(--canvas)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
              <InstagramIcon className="h-4 w-4 text-[var(--ink)]" />
              <h3 className="font-bold text-sm text-[var(--ink)]">Instagram Delivery</h3>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--muted)]">Status</span>
                <span className="font-mono text-[var(--ink)] font-bold">{publishingState}</span>
              </div>
              {project.analyticsJournal.permalink ? (
                <a
                  href={project.analyticsJournal.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline font-semibold"
                >
                  View live post
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Post to Instagram is currently not connected. Bind social profiles in Settings to distribute reels directly.
                </p>
              )}
            </div>
          </Panel>

          {/* Learnings / Feedback loop */}
          <Panel className="border border-[var(--hairline)] bg-[var(--canvas)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
              <Clock className="h-4 w-4 text-[var(--ink)]" />
              <h3 className="font-bold text-sm text-[var(--ink)]">Learnings reflection</h3>
            </div>
            
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              {project.analyticsJournal.reflection.trim() || "No reflection captured yet. When the reel is live, run `/analyze` in the Agent to audit metrics."}
            </p>
            {project.analyticsJournal.followUpIdea.trim() && (
              <div className="rounded-md border border-[var(--hairline)] bg-[var(--surface-soft)] p-3 space-y-1">
                <span className="text-[9px] font-mono uppercase text-[var(--muted)] tracking-wider block">Follow-up Idea</span>
                <p className="text-xs text-[var(--ink)] leading-relaxed">{project.analyticsJournal.followUpIdea}</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
