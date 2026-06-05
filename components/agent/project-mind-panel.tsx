"use client";

import { useState } from "react";
import { Bot, ChevronRight, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

export const READINESS_CHECK_PROMPT =
  "/readiness-check Analyze this project's readiness across script, shoot, assets, edit, and publish. Give blockers, confidence, and next action.";

type ReadinessAssessment = {
  status: "not_started" | "running" | "ready" | "blocked" | "stale" | "unavailable";
  overallLabel?: string;
  confidence?: number;
  lastCheckedAt?: string;
  summary?: string;
  dimensions?: Array<{
    key: "script" | "shoot" | "assets" | "edit" | "publish";
    label: string;
    score?: number;
    status: "strong" | "needs_work" | "blocked" | "unknown";
    evidence: string[];
    blockers: string[];
  }>;
  nextAction?: string;
};

type ProjectWithReadiness = ProjectWorkspace & {
  readinessAssessment?: ReadinessAssessment | null;
};

type ProjectMindPanelProps = {
  project: ProjectWorkspace;
  assetCount?: number;
  modelLabel?: string;
  hasRecentAgentOutput?: boolean;
  onQuickCommand?: (command: string) => void;
};

export function ProjectMindPanel({
  project,
  assetCount,
  modelLabel,
  hasRecentAgentOutput = false,
  onQuickCommand,
}: ProjectMindPanelProps) {
  const [projectMind, setProjectMind] = useState(() => projectMindDraft(project));
  const [draft, setDraft] = useState(() => projectMindDraft(project));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const readinessAssessment = (project as ProjectWithReadiness).readinessAssessment;
  const sources = [
    { label: "Attached assets", value: (assetCount ?? project.assets.length) > 0 ? `${assetCount ?? project.assets.length}` : "No sources yet" },
    { label: "Current script", value: project.scriptLab.script.trim() ? "Available" : "No script yet" },
    { label: "Recent agent output", value: hasRecentAgentOutput ? "Available" : "No recent output" },
  ];

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

  function runReadinessCheck() {
    onQuickCommand?.(READINESS_CHECK_PROMPT);
  }

  return (
    <aside
      aria-label="ProjectMind"
      data-floating="true"
      data-state={isExpanded ? "expanded" : "collapsed"}
      className={cn(
        "fixed right-4 top-[9.75rem] z-30 hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(17,20,28,.92)] shadow-[var(--shadow-soft)] backdrop-blur-[18px] transition-[width,max-height,transform,opacity,border-radius] duration-[var(--sb-motion-slow)] ease-[cubic-bezier(.2,.8,.2,1)] xl:block",
        isExpanded ? "w-[320px] max-h-[min(68vh,42rem)] opacity-100" : "h-12 w-12 max-h-12 opacity-90 hover:opacity-100",
      )}
    >
      {isExpanded ? (
        <div className="max-h-[min(68vh,42rem)] overflow-y-auto p-4 scrollbar-thin">
          <div className="mb-4 flex items-center justify-between gap-3">
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

          <div className="grid gap-4">
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
                  onClick={() => {
                    setMessage(null);
                    setDraft(projectMind);
                    setIsEditing((current) => !current);
                  }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
              <Fact label="Platform" value={project.platform} />
              <Fact label="Format" value={project.format} />
              {isEditing ? (
                <div className="grid gap-2 border-t border-[var(--line)] pt-2">
                  <ProjectMindInput label="Angle" value={draft.angle} onChange={(value) => setDraft((current) => ({ ...current, angle: value }))} />
                  <ProjectMindInput label="Hook" value={draft.hook} onChange={(value) => setDraft((current) => ({ ...current, hook: value }))} />
                  <ProjectMindInput label="CTA" value={draft.cta} onChange={(value) => setDraft((current) => ({ ...current, cta: value }))} />
                  <Button
                    type="button"
                    variant="coral"
                    disabled={isSaving}
                    onClick={() => void saveProjectMind()}
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

            <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Project Readiness</p>
                <ReadinessStatusBadge assessment={readinessAssessment} />
              </div>
              <ReadinessSummary assessment={readinessAssessment} />
              <Button
                type="button"
                variant="runtime"
                onClick={runReadinessCheck}
                className="h-8 min-h-8 justify-center gap-1.5 px-3 py-1 text-[10px]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Run readiness check
              </Button>
            </section>

            <section className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-3">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Sources</p>
              {sources.map((source) => (
                <Fact key={source.label} label={source.label} value={source.value} />
              ))}
            </section>

            <section className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.035)] p-3">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Environment</p>
              <Fact label="Workspace" value={`Changed ${shortDate(project.updatedAt)}`} />
              <Fact label="Asset count" value={String(assetCount ?? project.assets.length)} />
              <Fact label="Model" value={modelLabel || "default routing"} />
            </section>
          </div>
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
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[rgba(17,20,28,.92)] bg-[var(--lime)]" />
          </span>
        </button>
      )}
    </aside>
  );
}

function projectMindDraft(project: ProjectWorkspace) {
  return {
    hook: project.scriptLab.hook,
    cta: project.scriptLab.cta,
    angle: project.scriptLab.angle,
  };
}

function ReadinessStatusBadge({ assessment }: { assessment?: ReadinessAssessment | null }) {
  if (!assessment) {
    return <Badge className="border border-[var(--line)] bg-[rgba(255,255,255,.055)] text-[10px] text-[var(--muted)]">not checked</Badge>;
  }

  const label = assessment.status === "running" ? "checking" : assessment.status.replace(/_/g, " ");
  return <Badge className={readinessBadgeClass(assessment.status)}>{label}</Badge>;
}

function ReadinessSummary({ assessment }: { assessment?: ReadinessAssessment | null }) {
  if (!assessment) {
    return (
      <div className="grid gap-1.5 text-xs leading-relaxed text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">No AI readiness check yet.</p>
        <p>Ask the Agent to analyze the brief, script, shoot checklist, asset state, editing progress, and analytics state.</p>
      </div>
    );
  }

  if (assessment.status === "running") {
    return (
      <div className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
        <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-[var(--blue-2)]" />
        <p>Readiness check is running.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 text-xs leading-relaxed text-[var(--muted)]">
      <p className="font-semibold text-[var(--ink)]">{assessment.overallLabel || humanize(assessment.status)}</p>
      {assessment.summary ? <p>{assessment.summary}</p> : null}
      {assessment.nextAction ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.04)] px-2 py-1.5 text-[var(--ink)]">
          {assessment.nextAction}
        </p>
      ) : null}
      {assessment.lastCheckedAt ? (
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Checked {shortDate(assessment.lastCheckedAt)}</p>
      ) : null}
    </div>
  );
}

function readinessBadgeClass(status: ReadinessAssessment["status"]) {
  return cn(
    "border text-[10px] rounded-[var(--radius-pill)]",
    status === "ready"
      ? "border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--lime)]"
      : status === "blocked"
        ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]"
        : status === "running"
          ? "border-[var(--blue)]/40 bg-[var(--blue)]/10 text-[var(--blue-2)]"
          : "border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)]",
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

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function humanize(value: string) {
  const words = value.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Readiness";
}
