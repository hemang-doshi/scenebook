import { generateText } from "@/lib/ai/client";
import {
  buildProjectMind,
  compactProjectMindForModel,
} from "@/lib/agent/runtime-v4/memory/project-mind";
import type { ProjectMindSnapshot } from "@/lib/agent/runtime-v4/memory/memory-types";
import {
  blockerSeverities,
  readinessAreas,
  readinessLabels,
  readinessStages,
  type AiReadinessAnalysis,
  type AiReadinessArea,
  type AiReadinessLabel,
  type AiReadinessSeverity,
  type AiReadinessStage,
} from "@/lib/agent/readiness/readiness-schema";

type AnalyzeProjectReadinessInput = {
  projectId: string;
  modelOverride?: string;
  forceRefresh?: boolean;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function stringList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6);
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && values.includes(value) ? value : fallback;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    }
  }
  throw new Error("AI readiness response was not valid JSON.");
}

function normalizeAnalysis(raw: Record<string, unknown>, input: { model?: string; fallbackUsed?: boolean }): AiReadinessAnalysis {
  const blockers = Array.isArray(raw.blockers) ? raw.blockers : [];
  const nextActions = Array.isArray(raw.nextActions) ? raw.nextActions : [];
  const evidence = raw.evidence && typeof raw.evidence === "object" && !Array.isArray(raw.evidence)
    ? raw.evidence as Record<string, unknown>
    : {};

  return {
    score: Math.round(clampNumber(raw.score, 0, 100, 0)),
    label: enumValue(raw.label, readinessLabels, "Needs work") as AiReadinessLabel,
    confidence: clampNumber(raw.confidence, 0, 1, input.fallbackUsed ? 0.45 : 0.7),
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim() : "No readiness summary returned.",
    stage: enumValue(raw.stage, readinessStages, "analysis") as AiReadinessStage,
    blockers: blockers
      .filter((blocker): blocker is Record<string, unknown> => Boolean(blocker) && typeof blocker === "object" && !Array.isArray(blocker))
      .slice(0, 6)
      .map((blocker) => ({
        area: enumValue(blocker.area, readinessAreas, "brief") as AiReadinessArea,
        severity: enumValue(blocker.severity, blockerSeverities, "medium") as AiReadinessSeverity,
        reason: typeof blocker.reason === "string" && blocker.reason.trim() ? blocker.reason.trim() : "Missing readiness signal.",
        suggestedAction: typeof blocker.suggestedAction === "string" && blocker.suggestedAction.trim()
          ? blocker.suggestedAction.trim()
          : "Ask the Agent to fill this gap.",
      })),
    nextActions: nextActions
      .filter((action): action is Record<string, unknown> => Boolean(action) && typeof action === "object" && !Array.isArray(action))
      .slice(0, 5)
      .map((action) => ({
        title: typeof action.title === "string" && action.title.trim() ? action.title.trim() : "Continue with Agent",
        command: typeof action.command === "string" && action.command.trim() ? action.command.trim() : undefined,
        reason: typeof action.reason === "string" && action.reason.trim() ? action.reason.trim() : "Moves the project forward.",
      })),
    evidence: {
      scriptSignals: stringList(evidence.scriptSignals),
      shootSignals: stringList(evidence.shootSignals),
      assetSignals: stringList(evidence.assetSignals),
      publishSignals: stringList(evidence.publishSignals),
    },
    fallbackUsed: input.fallbackUsed ?? false,
    generatedAt: new Date().toISOString(),
    model: input.model,
  };
}

function labelForScore(score: number): AiReadinessLabel {
  if (score >= 88) return "Publish-ready";
  if (score >= 74) return "Shoot-ready";
  if (score >= 58) return "Promising";
  if (score >= 30) return "Needs work";
  return "Blocked";
}

function stageFromSnapshot(snapshot: ProjectMindSnapshot): AiReadinessStage {
  const next = snapshot.readiness.nextLikelyStage;
  if (next === "briefing") return "brief";
  if (next === "scripting") return "script";
  if (next === "asset_planning" || next === "generating_assets") return "assets";
  if (next === "editing") return "edit";
  if (next === "publishing") return "publish";
  if (next === "analyzing") return "analysis";
  return "shoot";
}

export function fallbackReadinessAnalysis(snapshot: ProjectMindSnapshot): AiReadinessAnalysis {
  const readiness = snapshot.readiness;
  const score = Math.round((
    readiness.briefCompleteness +
    readiness.scriptCompleteness +
    readiness.shootReadiness +
    readiness.assetReadiness +
    readiness.publishReadiness
  ) / 5);
  const missing = readiness.missing.length > 0 ? readiness.missing : ["AI readiness analysis"];

  return {
    score,
    label: labelForScore(score),
    confidence: 0.42,
    summary: `Fallback readiness uses deterministic ProjectMind signals. Missing: ${missing.join(", ")}.`,
    stage: stageFromSnapshot(snapshot),
    blockers: missing.map((item) => ({
      area: item.includes("shoot") ? "shoot" : item.includes("asset") ? "assets" : item.includes("publish") ? "publish" : item.includes("script") ? "script" : "brief",
      severity: score < 45 ? "high" : "medium",
      reason: `${item} is not strong enough yet.`,
      suggestedAction: `Ask the Agent to strengthen the ${item}.`,
    })),
    nextActions: [
      {
        title: "Ask Agent for next step",
        command: "/readiness-check",
        reason: "AI analysis was unavailable, so the cockpit is showing fallback signals.",
      },
    ],
    evidence: {
      scriptSignals: [
        `Script completeness ${readiness.scriptCompleteness}%`,
        snapshot.scriptLab.hook ? "Hook is present." : "Hook is missing.",
      ],
      shootSignals: [
        `Shoot readiness ${readiness.shootReadiness}%`,
        `${snapshot.shootPack.bRoll.length} B-roll beats`,
      ],
      assetSignals: [
        `${snapshot.assetLibrary.count} assets available`,
      ],
      publishSignals: [
        `Publish readiness ${readiness.publishReadiness}%`,
        snapshot.publish?.ready ? "Caption or publish signal exists." : "Publish package is missing.",
      ],
    },
    fallbackUsed: true,
    generatedAt: new Date().toISOString(),
  };
}

function buildPrompt(snapshot: ProjectMindSnapshot) {
  const compact = compactProjectMindForModel(snapshot);
  return [
    "Return strict JSON only. Do not wrap in Markdown.",
    "Analyze whether this SceneBook project is ready for its next production stage.",
    "Use the deterministic readiness only as pre-analysis signals, not as the final truth.",
    "Schema: { score: number 0-100, label: \"Blocked\"|\"Needs work\"|\"Promising\"|\"Shoot-ready\"|\"Publish-ready\", confidence: number 0-1, summary: string, stage: \"brief\"|\"script\"|\"shoot\"|\"assets\"|\"edit\"|\"publish\"|\"analysis\", blockers: [{ area: \"brief\"|\"script\"|\"shoot\"|\"assets\"|\"edit\"|\"publish\"|\"analytics\", severity: \"low\"|\"medium\"|\"high\", reason: string, suggestedAction: string }], nextActions: [{ title: string, command?: string, reason: string }], evidence: { scriptSignals: string[], shootSignals: string[], assetSignals: string[], publishSignals: string[] } }",
    "Prefer concise, specific language that tells the creator what to do next.",
    JSON.stringify(compact),
  ].join("\n\n");
}

export async function analyzeProjectReadiness(input: AnalyzeProjectReadinessInput): Promise<AiReadinessAnalysis> {
  void input.forceRefresh;
  const snapshot = await buildProjectMind({ projectId: input.projectId });

  try {
    const text = await generateText({
      modelOverride: input.modelOverride,
      systemInstruction: "You are SceneBook's project readiness analyst. Be concrete, brief, and production-aware.",
      prompt: buildPrompt(snapshot),
    });
    const raw = parseJsonObject(text);
    return normalizeAnalysis(raw, { model: input.modelOverride, fallbackUsed: false });
  } catch {
    return fallbackReadinessAnalysis(snapshot);
  }
}
