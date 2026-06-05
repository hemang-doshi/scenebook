"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronRight, Library, Loader2, Sparkles, WandSparkles } from "lucide-react";

import { AssetLibraryPanel } from "@/components/agent/asset-library-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiReadinessAnalysis } from "@/lib/agent/readiness/readiness-schema";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

export const READINESS_CHECK_PROMPT =
  "/readiness-check Analyze this project's readiness across script, shoot, assets, edit, and publish. Give blockers, confidence, and next action.";

type CockpitTab = "mind" | "assets" | "actions";

type ReadinessResponse = {
  analysis: AiReadinessAnalysis;
  cached?: boolean;
};

type ProjectCockpitProps = {
  project: ProjectWorkspace;
  assetCount?: number;
  modelLabel?: string;
  hasRecentAgentOutput?: boolean;
  onQuickCommand?: (command: string) => void;
};

const quickCommands = [
  { command: "/script Write a sharper script package from the current ProjectMind.", label: "/script" },
  { command: "/form-json-prompt Create image and video prompts for the missing production assets.", label: "/form-json-prompt" },
  { command: "/generate-image Create the next highest-leverage visual asset.", label: "/generate-image" },
  { command: "/publish-prep Prepare caption, hashtags, and final posting checklist.", label: "/publish-prep" },
  { command: "/analyze Review blockers and recommend the next useful action.", label: "/analyze" },
];

function projectMindDraft(project: ProjectWorkspace) {
  return {
    hook: project.scriptLab.hook,
    cta: project.scriptLab.cta,
    angle: project.scriptLab.angle,
  };
}

export function ProjectCockpit({
  project,
  assetCount,
  modelLabel,
  hasRecentAgentOutput = false,
  onQuickCommand,
}: ProjectCockpitProps) {
  const [projectMind, setProjectMind] = useState(() => projectMindDraft(project));
  const [draft, setDraft] = useState(() => projectMindDraft(project));
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<CockpitTab>("mind");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiReadinessAnalysis | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [library, setLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  const totalAssets = useMemo(
    () => assetCount ?? library?.folders.reduce((total, folder) => total + folder.assets.length, library.looseAssets.length) ?? project.assets.length,
    [assetCount, library, project.assets.length],
  );

  useEffect(() => {
    if (!isExpanded || activeTab !== "assets" || library) {
      return;
    }

    let cancelled = false;
    async function loadLibrary() {
      setLoadingAssets(true);
      setAssetError(null);
      try {
        const nextLibrary = await fetchJson<ProjectAssetLibrary>(`/api/projects/${project.id}/assets`);
        if (!cancelled) {
          setLibrary(nextLibrary);
        }
      } catch (caught) {
        if (!cancelled) {
          setAssetError(caught instanceof Error ? caught.message : "Unable to load assets.");
        }
      } finally {
        if (!cancelled) {
          setLoadingAssets(false);
        }
      }
    }

    void loadLibrary();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isExpanded, library, project.id]);

  async function saveProjectMind() {
    setIsSaving(true);
    setMessage(null);
    try {
      await fetchJson<ProjectWorkspace>(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          scriptLab: {
            angle: draft.angle,
            hook: draft.hook,
            cta: draft.cta,
          },
        }),
      });
      setProjectMind(draft);
      setMessage("ProjectMind updated");
      setIsEditing(false);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to update ProjectMind.");
    } finally {
      setIsSaving(false);
    }
  }

  async function runReadinessCheck() {
    setIsChecking(true);
    setReadinessError(null);
    try {
      const response = await fetchJson<ReadinessResponse>(`/api/projects/${project.id}/readiness`, {
        method: "POST",
        body: JSON.stringify({ modelOverride: modelLabel }),
      });
      setAnalysis(response.analysis);
    } catch (caught) {
      setReadinessError(caught instanceof Error ? caught.message : "Unable to run readiness check.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <aside
      aria-label="ProjectMind"
      data-floating="true"
      data-state={isExpanded ? "expanded" : "collapsed"}
      className={cn(
        "fixed right-4 top-[9.75rem] z-30 hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(17,20,28,.92)] shadow-[var(--shadow-soft)] backdrop-blur-[18px] transition-[width,max-height,transform,opacity,border-radius] duration-[var(--sb-motion-slow)] ease-[cubic-bezier(.2,.8,.2,1)] xl:block",
        isExpanded ? "w-[352px] max-h-[min(72vh,46rem)] opacity-100" : "h-12 w-12 max-h-12 opacity-90 hover:opacity-100",
      )}
    >
      {isExpanded ? (
        <div className="max-h-[min(72vh,46rem)] overflow-y-auto p-4 scrollbar-thin">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/12 text-[var(--blue-2)]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--blue-2)]">ProjectMind</p>
                <p className="truncate text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">{project.status}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 min-h-8 w-8 rounded-full px-0 py-0"
              aria-label="Collapse ProjectMind"
              title="Collapse ProjectMind"
              onClick={() => {
                setMessage(null);
                setIsEditing(false);
                setIsExpanded(false);
              }}
            >
              <ChevronRight className="h-4 w-4 text-[var(--ink)]/70" />
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-1 rounded-[var(--radius-pill)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-1">
            {(["mind", "assets", "actions"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  "h-7 rounded-[var(--radius-pill)] text-[10px] font-mono font-bold uppercase tracking-wider transition-colors",
                  activeTab === tab
                    ? "bg-[var(--white)] text-[var(--black)]"
                    : "text-[var(--muted)] hover:bg-[rgba(255,255,255,.055)] hover:text-[var(--ink)]",
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "mind" ? (
            <div className="grid gap-4">
              <ContextCard
                project={project}
                projectMind={projectMind}
                draft={draft}
                isEditing={isEditing}
                isSaving={isSaving}
                message={message}
                onDraftChange={setDraft}
                onEditToggle={() => {
                  setMessage(null);
                  setDraft(projectMind);
                  setIsEditing((current) => !current);
                }}
                onSave={() => void saveProjectMind()}
              />
              <ReadinessCard
                analysis={analysis}
                isChecking={isChecking}
                error={readinessError}
                onRun={() => void runReadinessCheck()}
                onQuickCommand={onQuickCommand}
              />
              <section className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-3">
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Sources</p>
                <Fact label="Attached assets" value={totalAssets > 0 ? String(totalAssets) : "No sources yet"} />
                <Fact label="Current script" value={project.scriptLab.script.trim() ? "Available" : "No script yet"} />
                <Fact label="Recent agent output" value={hasRecentAgentOutput ? "Available" : "No recent output"} />
              </section>
            </div>
          ) : null}

          {activeTab === "assets" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Assets</p>
                  <p className="mt-1 text-xs text-[var(--ink)]">{totalAssets} available</p>
                </div>
                <Library className="h-4 w-4 text-[var(--blue-2)]" />
              </div>
              <AssetLibraryPanel projectId={project.id} library={library} loading={loadingAssets} error={assetError} compact />
            </div>
          ) : null}

          {activeTab === "actions" ? (
            <div className="grid gap-3">
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                Send one focused command to the Agent composer.
              </p>
              {quickCommands.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex min-h-10 items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.04)] px-3 py-2 text-left transition-colors hover:border-[var(--blue)]/50 hover:bg-[var(--blue)]/10"
                  onClick={() => onQuickCommand?.(item.command)}
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--ink)]">{item.label}</span>
                  <WandSparkles className="h-3.5 w-3.5 shrink-0 text-[var(--blue-2)]" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Expand ProjectMind"
          title="Open ProjectMind"
          className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] text-[var(--blue-2)] transition-colors hover:bg-[rgba(255,255,255,.055)] focus-visible:outline-none focus-visible:ring-0"
          onClick={() => setIsExpanded(true)}
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/12">
            <Bot className="h-4 w-4" />
            <span className={cn(
              "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[rgba(17,20,28,.92)]",
              analysis ? "bg-[var(--lime)]" : "bg-[var(--amber)]",
            )} />
          </span>
        </button>
      )}
    </aside>
  );
}

function ContextCard({
  project,
  projectMind,
  draft,
  isEditing,
  isSaving,
  message,
  onDraftChange,
  onEditToggle,
  onSave,
}: {
  project: ProjectWorkspace;
  projectMind: ReturnType<typeof projectMindDraft>;
  draft: ReturnType<typeof projectMindDraft>;
  isEditing: boolean;
  isSaving: boolean;
  message: string | null;
  onDraftChange: (draft: ReturnType<typeof projectMindDraft>) => void;
  onEditToggle: () => void;
  onSave: () => void;
}) {
  return (
    <section className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Context</p>
          <h3 className="mt-1 truncate text-sm font-bold text-[var(--ink)]">{project.title}</h3>
        </div>
        <Button
          type="button"
          variant={isEditing ? "ghost" : "secondary"}
          className="h-7 min-h-7 shrink-0 px-2 py-1 text-[9px]"
          onClick={onEditToggle}
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>
      <Fact label="Platform" value={project.platform} />
      <Fact label="Format" value={project.format} />
      {isEditing ? (
        <div className="grid gap-2 border-t border-[var(--line)] pt-2">
          <ProjectMindInput label="Angle" value={draft.angle} onChange={(value) => onDraftChange({ ...draft, angle: value })} />
          <ProjectMindInput label="Hook" value={draft.hook} onChange={(value) => onDraftChange({ ...draft, hook: value })} />
          <ProjectMindInput label="CTA" value={draft.cta} onChange={(value) => onDraftChange({ ...draft, cta: value })} />
          <Button
            type="button"
            variant="coral"
            disabled={isSaving}
            onClick={onSave}
            className="h-8 min-h-8 justify-center px-3 py-1 text-[10px]"
          >
            {isSaving ? "Saving" : "Save ProjectMind"}
          </Button>
        </div>
      ) : (
        <>
          <Fact label="Angle" value={projectMind.angle || "unknown"} />
          <Fact label="Hook" value={projectMind.hook || "unknown"} />
          <Fact label="CTA" value={projectMind.cta || "unknown"} />
        </>
      )}
      {message ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.045)] px-3 py-2 text-xs text-[var(--muted)]">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function ReadinessCard({
  analysis,
  isChecking,
  error,
  onRun,
  onQuickCommand,
}: {
  analysis: AiReadinessAnalysis | null;
  isChecking: boolean;
  error: string | null;
  onRun: () => void;
  onQuickCommand?: (command: string) => void;
}) {
  const blockersBySeverity = (analysis?.blockers ?? []).reduce<Record<string, AiReadinessAnalysis["blockers"]>>((groups, blocker) => {
    groups[blocker.severity] = [...(groups[blocker.severity] ?? []), blocker];
    return groups;
  }, {});

  return (
    <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Project Readiness</p>
        <ReadinessBadge analysis={analysis} isChecking={isChecking} />
      </div>

      {!analysis && !isChecking ? (
        <div className="grid gap-1.5 text-xs leading-relaxed text-[var(--muted)]">
          <p className="font-semibold text-[var(--ink)]">No AI readiness check yet.</p>
          <p>Ask the cockpit to analyze the brief, script, shoot checklist, assets, editing progress, and analytics state.</p>
        </div>
      ) : null}

      {isChecking ? (
        <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
          <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-[var(--blue-2)]" />
          <p>Readiness check is running.</p>
        </div>
      ) : null}

      {analysis ? (
        <div className="grid gap-3 text-xs leading-relaxed text-[var(--muted)]">
          <div>
            <div className="flex items-end justify-between gap-2">
              <p className="text-lg font-bold text-[var(--ink)]">{analysis.label}</p>
              <p className="font-mono text-[11px] text-[var(--blue-2)]">{analysis.score}%</p>
            </div>
            <p className="mt-1">{analysis.summary}</p>
          </div>

          {Object.entries(blockersBySeverity).map(([severity, blockers]) => (
            <div key={severity} className="grid gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-2">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">{severity} blockers</p>
              {blockers.map((blocker) => (
                <p key={`${blocker.area}-${blocker.reason}`} className="text-[var(--ink)]/90">
                  {blocker.reason} <span className="text-[var(--muted)]">{blocker.suggestedAction}</span>
                </p>
              ))}
            </div>
          ))}

          {analysis.nextActions.length > 0 ? (
            <div className="grid gap-1.5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">Next actions</p>
              {analysis.nextActions.map((action) => (
                <button
                  key={`${action.title}-${action.command ?? action.reason}`}
                  type="button"
                  className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.04)] px-2 py-1.5 text-left text-xs text-[var(--ink)] transition-colors hover:border-[var(--blue)]/50"
                  onClick={() => action.command ? onQuickCommand?.(action.command) : undefined}
                >
                  <span className="font-semibold">{action.title}</span>
                  <span className="block text-[10px] text-[var(--muted)]">{action.reason}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-2">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">Evidence</p>
            {[...analysis.evidence.scriptSignals, ...analysis.evidence.shootSignals, ...analysis.evidence.assetSignals, ...analysis.evidence.publishSignals]
              .slice(0, 4)
              .map((signal) => (
                <p key={signal} className="text-[10px] text-[var(--muted)]">{signal}</p>
              ))}
          </div>

          {analysis.fallbackUsed ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--amber)]/30 bg-[var(--amber)]/10 px-2 py-1.5 text-[10px] text-[var(--amber)]">
              AI unavailable. Showing deterministic fallback signals.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      <Button
        type="button"
        variant="runtime"
        disabled={isChecking}
        onClick={onRun}
        className="h-8 min-h-8 justify-center gap-1.5 px-3 py-1 text-[10px]"
      >
        {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Run readiness check
      </Button>
    </section>
  );
}

function ReadinessBadge({ analysis, isChecking }: { analysis: AiReadinessAnalysis | null; isChecking: boolean }) {
  if (isChecking) {
    return <Badge className="border border-[var(--blue)]/40 bg-[var(--blue)]/10 text-[10px] text-[var(--blue-2)]">checking</Badge>;
  }
  if (!analysis) {
    return <Badge className="border border-[var(--line)] bg-[rgba(255,255,255,.055)] text-[10px] text-[var(--muted)]">not checked</Badge>;
  }

  return (
    <Badge className={cn(
      "border text-[10px] rounded-[var(--radius-pill)]",
      analysis.label === "Publish-ready" || analysis.label === "Shoot-ready"
        ? "border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--lime)]"
        : analysis.label === "Blocked"
          ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]"
          : "border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)]",
    )}>
      {analysis.stage}
    </Badge>
  );
}

function ProjectMindInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-[var(--muted)]">
      <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      <Input
        aria-label={`ProjectMind ${label.toLowerCase()}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 text-xs"
      />
    </label>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[var(--line)] pb-2 last:border-b-0 last:pb-0">
      <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="mt-1 truncate text-xs text-[var(--ink)]" title={value}>{value}</p>
    </div>
  );
}
