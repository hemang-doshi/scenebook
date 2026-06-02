"use client";

import { Check, Copy, FileText } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArtifactTimelineEntry } from "@/components/agent/types";

type ArtifactPreviewCardProps = {
  entry: ArtifactTimelineEntry;
};

const fullPackageSections = [
  { title: "Plan", keys: ["plan"], artifactType: "creative_brief" },
  { title: "Script", keys: ["scriptPackage", "script_package", "script"], artifactType: "script_package" },
  { title: "Shoot", keys: ["shootPack", "shoot_pack"], artifactType: "shoot_pack" },
  { title: "Assets", keys: ["assetPromptPack", "asset_prompt_pack", "assetPrompts"], artifactType: "asset_prompt_pack" },
  { title: "Publish", keys: ["publishPrep", "publish_prep", "publishPackage", "publish_package"], artifactType: "publish_package" },
];

const artifactSections: Record<string, { title: string; keys?: string[] }[]> = {
  script_package: [{ title: "Script" }],
  shoot_pack: [{ title: "Shoot" }],
  asset_prompt_pack: [{ title: "Assets" }],
  publish_package: [{ title: "Publish" }],
  content_review: [{ title: "Review" }],
};

const copyLabels: Record<string, string> = {
  script: "script",
  caption: "caption",
  hashtags: "hashtags",
  cinematicJsonPrompts: "cinematic JSON prompts",
  imagePrompts: "image prompts",
  brollPrompts: "B-roll prompts",
  assetPrompts: "asset prompts",
  thumbnailPrompt: "thumbnail prompt",
};

export function ArtifactPreviewCard({ entry }: ArtifactPreviewCardProps) {
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
        <ArtifactPreviewContent entry={entry} />
      </CardContent>
    </Card>
  );
}

export function ArtifactPreviewContent({ entry }: ArtifactPreviewCardProps) {
  const payload = asRecord(entry.payload);

  return entry.artifactType === "full_production_package"
    ? renderFullProductionPackage(payload)
    : renderArtifactPayload(entry.artifactType, payload);
}

function renderFullProductionPackage(payload: Record<string, unknown>) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5" aria-label="Production package sections">
        {fullPackageSections.map((section) => (
          <span
            key={section.title}
            className="rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--canvas)] px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/65"
          >
            {section.title}
          </span>
        ))}
      </div>
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
            <div className="mt-2 grid gap-2">{renderRecordFields(value, section.artifactType)}</div>
          </section>
        );
      })}
    </div>
  );
}

function renderArtifactPayload(artifactType: string, payload: Record<string, unknown>) {
  const sections = artifactSections[artifactType] ?? [{ title: "Details" }];
  const renderedSections = sections
    .map((section) => {
      const value = section.keys ? firstRecord(payload, section.keys) : payload;
      if (!value) {
        return null;
      }
      const fields = preferredFields(artifactType, value);
      if (fields.length === 0) {
        return null;
      }

      return (
        <section
          key={section.title}
          className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)]/45 p-3"
        >
          <h4 className="text-xs font-bold text-[var(--ink)]">{section.title}</h4>
          <div className="mt-2 grid gap-2">
            {fields.map(([key, fieldValue]) => (
              <FieldValue key={key} fieldKey={key} label={humanize(key)} value={fieldValue} />
            ))}
          </div>
        </section>
      );
    })
    .filter(Boolean);

  if (renderedSections.length === 0) {
    return null;
  }

  return <div className="grid gap-3">{renderedSections}</div>;
}

function renderRecordFields(record: Record<string, unknown>, artifactType = "default") {
  return preferredFields(artifactType, record).map(([key, value]) => (
    <FieldValue key={key} fieldKey={key} label={humanize(key)} value={value} />
  ));
}

function FieldValue({ fieldKey, label, value }: { fieldKey: string; label: string; value: unknown }) {
  const [copied, setCopied] = useState(false);

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const copyLabel = copyLabels[fieldKey];
  const copyText = copyLabel ? copyableValue(value) : null;
  const handleCopy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  const labelRow = (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink)]/50">{label}</p>
      {copyText ? (
        <Button
          type="button"
          variant="ghost"
          className="h-7 shrink-0 gap-1 px-2 text-[10px] text-[var(--ink)]/70"
          aria-label={`Copy ${copyLabel}`}
          title={`Copy ${copyLabel}`}
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </Button>
      ) : null}
    </div>
  );

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div className="grid gap-1">
        {labelRow}
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
        {labelRow}
        <div className="grid gap-1 rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2">
          {Object.entries(value).map(([key, nested]) => (
            <FieldValue key={key} fieldKey={key} label={humanize(key)} value={nested} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      {labelRow}
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

function copyableValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    const text = value.map(formatValue).filter(Boolean).join("\n");
    return text || null;
  }
  if (isRecord(value)) {
    return JSON.stringify(value, null, 2);
  }
  const text = String(value).trim();
  return text || null;
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
