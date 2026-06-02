"use client";

import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArtifactTimelineEntry } from "@/components/agent/types";

type ArtifactPreviewCardProps = {
  entry: ArtifactTimelineEntry;
};

const fullPackageSections = [
  { title: "Plan", keys: ["plan"] },
  { title: "Script", keys: ["scriptPackage", "script_package", "script"] },
  { title: "Shoot Pack", keys: ["shootPack", "shoot_pack"] },
  { title: "Asset Prompts", keys: ["assetPromptPack", "asset_prompt_pack", "assetPrompts"] },
  { title: "Publish Prep", keys: ["publishPrep", "publish_prep", "publishPackage"] },
];

export function ArtifactPreviewCard({ entry }: ArtifactPreviewCardProps) {
  const payload = asRecord(entry.payload);

  return (
    <Card className="border border-[var(--hairline)] bg-[var(--canvas)] shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55">
            <FileText className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Artifact</span>
          </div>
          <CardTitle className="text-sm font-bold leading-snug text-[var(--ink)]">{entry.title}</CardTitle>
          {entry.summary ? <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/90">{entry.summary}</p> : null}
        </div>
        <Badge className="border border-[var(--hairline)] bg-[var(--surface-soft)] text-[10px] text-[var(--ink)]/80">
          {humanize(entry.artifactType)}
        </Badge>
      </CardHeader>

      <CardContent className="grid gap-3 p-5 pt-0 text-sm text-[var(--ink)]">
        {entry.artifactType === "full_production_package"
          ? renderFullProductionPackage(payload)
          : renderArtifactPayload(entry.artifactType, payload)}
      </CardContent>
    </Card>
  );
}

function renderFullProductionPackage(payload: Record<string, unknown>) {
  return (
    <div className="grid gap-3">
      {fullPackageSections.map((section) => {
        const value = firstRecord(payload, section.keys);
        if (!value) {
          return null;
        }

        return (
          <section
            key={section.title}
            className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/45 p-3"
          >
            <h4 className="text-xs font-bold text-[var(--ink)]">{section.title}</h4>
            <div className="mt-2 grid gap-2">{renderRecordFields(value)}</div>
          </section>
        );
      })}
    </div>
  );
}

function renderArtifactPayload(artifactType: string, payload: Record<string, unknown>) {
  const fields = preferredFields(artifactType, payload);
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/45 p-3">
      {fields.map(([key, value]) => (
        <FieldValue key={key} label={humanize(key)} value={value} />
      ))}
    </div>
  );
}

function renderRecordFields(record: Record<string, unknown>) {
  return preferredFields("default", record).map(([key, value]) => (
    <FieldValue key={key} label={humanize(key)} value={value} />
  ));
}

function FieldValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div className="grid gap-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/50">{label}</p>
        <ul className="grid gap-1">
          {value.map((item, index) => (
            <li key={`${label}-${index}`} className="text-xs leading-relaxed text-[var(--ink)]/90">
              {formatValue(item)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <div className="grid gap-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/50">{label}</p>
        <div className="grid gap-1 rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2">
          {Object.entries(value).map(([key, nested]) => (
            <FieldValue key={key} label={humanize(key)} value={nested} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/50">{label}</p>
      <p className="text-xs leading-relaxed text-[var(--ink)]/90">{String(value)}</p>
    </div>
  );
}

function preferredFields(artifactType: string, payload: Record<string, unknown>) {
  const fieldOrder: Record<string, string[]> = {
    creative_brief: ["audience", "platform", "format", "tone", "coreAngle", "viewerPromise", "visualStyle", "cta", "openQuestions"],
    script_package: ["selectedHook", "hookOptions", "script", "voiceover", "onScreenText", "cta", "captionSeed", "structure", "pacingNotes", "estimatedDurationSeconds"],
    shoot_pack: ["scenes", "aRoll", "bRoll", "screenCaptures", "props", "missingAssets", "visualNotes", "locationNotes", "editingNotes", "feasibilityNotes"],
    asset_prompt_pack: ["cinematicJsonPrompts", "imagePrompts", "brollPrompts", "thumbnailPrompt", "voiceoverDirection", "musicDirection", "negativePrompts", "modelNotes"],
    publish_package: ["caption", "hashtags", "postingChecklist", "thumbnailText", "description", "firstComment", "readinessWarnings", "platformNotes"],
    content_review: ["scorecard", "strengths", "weaknesses", "specificImprovements", "improvedVersion", "keep", "cut", "riskNotes"],
    default: Object.keys(payload),
  };
  const orderedKeys = fieldOrder[artifactType] ?? fieldOrder.default;
  const ordered = orderedKeys
    .filter((key) => Object.prototype.hasOwnProperty.call(payload, key))
    .map((key) => [key, payload[key]] as [string, unknown]);
  const extras = Object.entries(payload).filter(([key]) => !orderedKeys.includes(key));
  return [...ordered, ...extras].filter(([, value]) => value !== undefined && value !== null && value !== "");
}

function firstRecord(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (isRecord(value)) {
      return value;
    }
  }
  return null;
}

function formatValue(value: unknown): string {
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, nested]) => `${humanize(key)}: ${formatValue(nested)}`)
      .join(", ");
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ");
  }
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function humanize(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Artifact";
}
