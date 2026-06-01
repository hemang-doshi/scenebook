"use client";

import type { ProjectWorkspace } from "@/lib/data/repository";

function percent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

export function ProjectMindPanel({ project }: { project: ProjectWorkspace }) {
  const scriptFields = [
    project.scriptLab.angle,
    project.scriptLab.hook,
    project.scriptLab.outline,
    project.scriptLab.script,
    project.scriptLab.caption,
    project.scriptLab.cta,
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
    <aside className="hidden w-72 shrink-0 border-l border-[var(--hairline)] bg-[var(--surface-soft)]/45 px-4 py-5 xl:block">
      <div className="space-y-6">
        <section>
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Project Mind</p>
          <h3 className="mt-2 text-sm font-bold text-[var(--ink)]">{project.title}</h3>
          <p className="mt-1 text-xs font-mono uppercase tracking-wider text-[var(--muted)]">{project.status}</p>
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
          <Fact label="Hook" value={project.scriptLab.hook || "unknown"} />
          <Fact label="CTA" value={project.scriptLab.cta || "unknown"} />
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Next</p>
          <p className="text-sm font-semibold text-[var(--ink)]">{next}</p>
        </section>
      </div>
    </aside>
  );
}

function ReadinessRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <span className="font-mono font-bold text-[var(--ink)]">{percent(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--canvas)]">
        <div className="h-full bg-[var(--primary)]" style={{ width: percent(value) }} />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--hairline)] pb-2">
      <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="mt-1 line-clamp-2 text-xs text-[var(--ink)]">{value}</p>
    </div>
  );
}

