"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";

function percent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

export function ProjectMindPanel({ project }: { project: ProjectWorkspace }) {
  const [projectMind, setProjectMind] = useState(() => projectMindDraft(project));
  const [draft, setDraft] = useState(() => projectMindDraft(project));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const scriptFields = [
    projectMind.angle,
    projectMind.hook,
    project.scriptLab.outline,
    project.scriptLab.script,
    project.scriptLab.caption,
    projectMind.cta,
  ];
  const scriptScore = (scriptFields.filter(hasText).length / scriptFields.length) * 100;
  const shootItems = [
    ...project.shootPack.aRoll,
    ...project.shootPack.bRoll,
    ...project.shootPack.screenCaptures,
    ...project.shootPack.props,
    ...project.shootPack.missingAssets,
  ];
  const shootScore = shootItems.length > 0
    ? (shootItems.filter((item) => item.done).length / shootItems.length) * 100
    : 0;
  const assetScore = project.assets.length > 0 ? Math.min(100, 25 + project.assets.length * 25) : 0;
  const next = project.status === "posted"
    ? "Analyze performance"
    : scriptScore < 70
      ? "Strengthen script"
      : assetScore < 50
        ? "Generate assets"
        : "Prepare publish package";

  return (
    <aside
      aria-label="ProjectMind"
      data-floating="true"
      data-state={isExpanded ? "expanded" : "collapsed"}
      className="fixed right-4 top-24 z-30 hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(20,24,33,.88)] shadow-[var(--shadow-soft)] backdrop-blur-[18px] transition-[width,height,transform,opacity] duration-[var(--sb-motion-standard)] xl:block"
      style={{
        width: isExpanded ? "320px" : "56px",
        height: isExpanded ? "auto" : "56px",
        maxHeight: "calc(100vh - 7rem)",
      }}
    >
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(255,255,255,.045)] text-[var(--blue-2)]">
              <Bot className="h-4 w-4" />
            </div>
            {isExpanded ? (
              <div>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--blue-2)]">ProjectMind</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">{project.status}</p>
              </div>
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--lime)]" />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 min-h-8 px-2 text-[10px]"
            aria-label={isExpanded ? "Collapse ProjectMind" : "Expand ProjectMind"}
            onClick={() => {
              setMessage(null);
              setIsEditing(false);
              setIsExpanded((current) => !current);
            }}
          >
            {isExpanded ? "Hide" : "Open"}
          </Button>
        </div>

        {isExpanded ? (
          <div className="space-y-6 overflow-y-auto pr-1 scrollbar-thin">
            <section>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="mt-2 text-sm font-bold text-[var(--ink)]">{project.title}</h3>
                </div>
                <Button
                  type="button"
                  variant={isEditing ? "ghost" : "secondary"}
                  className="h-8 min-h-8 px-3 py-1 text-[10px]"
                  onClick={() => {
                    setMessage(null);
                    setDraft(projectMind);
                    setIsEditing((current) => !current);
                  }}
                >
                  {isEditing ? "Cancel" : "Edit ProjectMind"}
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Readiness</p>
              <ReadinessRow label="Script" value={scriptScore} />
              <ReadinessRow label="Shoot" value={shootScore} />
              <ReadinessRow label="Assets" value={assetScore} />
            </section>

            <section className="space-y-2">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Brief</p>
              <Fact label="Platform" value={project.platform} />
              <Fact label="Format" value={project.format} />
              {isEditing ? (
                <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.04)] p-3">
                  <label className="grid gap-1 text-xs text-[var(--muted)]">
                    <span className="font-mono text-[9px] uppercase tracking-widest">Angle</span>
                    <Input
                      aria-label="ProjectMind angle"
                      value={draft.angle}
                      onChange={(event) => setDraft((current) => ({ ...current, angle: event.target.value }))}
                      className="h-9 text-xs"
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--muted)]">
                    <span className="font-mono text-[9px] uppercase tracking-widest">Hook</span>
                    <Input
                      aria-label="ProjectMind hook"
                      value={draft.hook}
                      onChange={(event) => setDraft((current) => ({ ...current, hook: event.target.value }))}
                      className="h-9 text-xs"
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--muted)]">
                    <span className="font-mono text-[9px] uppercase tracking-widest">CTA</span>
                    <Input
                      aria-label="ProjectMind CTA"
                      value={draft.cta}
                      onChange={(event) => setDraft((current) => ({ ...current, cta: event.target.value }))}
                      className="h-9 text-xs"
                    />
                  </label>
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

            <section className="space-y-2">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Next</p>
              <p className="text-sm font-semibold text-[var(--ink)]">{next}</p>
            </section>
          </div>
        ) : null}
      </div>
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

function ReadinessRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <span className="font-mono font-bold text-[var(--ink)]">{percent(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,.075)]">
        <div
          className="h-full"
          style={{
            width: percent(value),
            background: "linear-gradient(90deg, var(--coral), var(--amber))",
          }}
        />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--line)] pb-2">
      <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="mt-1 line-clamp-2 text-xs text-[var(--ink)]">{value}</p>
    </div>
  );
}
