import type { JsonValue } from "@/lib/types";

export const readinessLabels = [
  "Blocked",
  "Needs work",
  "Promising",
  "Shoot-ready",
  "Publish-ready",
] as const;

export const readinessStages = [
  "brief",
  "script",
  "shoot",
  "assets",
  "edit",
  "publish",
  "analysis",
] as const;

export const readinessAreas = [
  "brief",
  "script",
  "shoot",
  "assets",
  "edit",
  "publish",
  "analytics",
] as const;

export const blockerSeverities = ["low", "medium", "high"] as const;

export type AiReadinessLabel = (typeof readinessLabels)[number];
export type AiReadinessStage = (typeof readinessStages)[number];
export type AiReadinessArea = (typeof readinessAreas)[number];
export type AiReadinessSeverity = (typeof blockerSeverities)[number];

export type AiReadinessAnalysis = {
  score: number;
  label: AiReadinessLabel;
  confidence: number;
  summary: string;
  stage: AiReadinessStage;
  blockers: Array<{
    area: AiReadinessArea;
    severity: AiReadinessSeverity;
    reason: string;
    suggestedAction: string;
  }>;
  nextActions: Array<{
    title: string;
    command?: string;
    reason: string;
  }>;
  evidence: {
    scriptSignals: string[];
    shootSignals: string[];
    assetSignals: string[];
    publishSignals: string[];
  };
  fallbackUsed?: boolean;
  generatedAt?: string;
  model?: string;
};

export type ReadinessMemoryContent = Record<string, JsonValue> & {
  kind: "ai_readiness_analysis";
  score: number;
  label: AiReadinessLabel;
  stage: AiReadinessStage;
  blockers: JsonValue;
  nextActions: JsonValue;
  evidence: JsonValue;
  generatedAt: string;
  model?: string;
  fallbackUsed?: boolean;
};
