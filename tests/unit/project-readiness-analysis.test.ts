import { beforeEach, describe, expect, test, vi } from "vitest";

const { buildProjectMind, generateText } = vi.hoisted(() => ({
  buildProjectMind: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("@/lib/agent/runtime-v4/memory/project-mind", () => ({
  buildProjectMind,
  compactProjectMindForModel: (snapshot: unknown) => snapshot,
}));

vi.mock("@/lib/ai/client", () => ({
  generateText,
}));

const snapshot = {
  project: {
    id: "project-1",
    title: "Goa Reel",
    platform: "instagram",
    format: "reel",
    status: "scripted",
  },
  scriptLab: {
    hook: "Open with the beach reveal.",
    script: "Show route, payoff, and CTA.",
    caption: "",
    cta: "Save this route.",
  },
  shootPack: {
    aRoll: [{ id: "a1", label: "Intro", done: true }],
    bRoll: [],
    screenCaptures: [],
    props: [],
    missingAssets: [],
  },
  assetLibrary: {
    count: 1,
    recent: [{ id: "asset-1", title: "Beach still", type: "image" }],
  },
  readiness: {
    briefCompleteness: 72,
    scriptCompleteness: 84,
    shootReadiness: 35,
    assetReadiness: 50,
    editorReadiness: 0,
    publishReadiness: 0,
    nextLikelyStage: "asset_planning",
    missing: ["shoot pack", "publish package"],
  },
};

describe("project readiness analysis", () => {
  beforeEach(() => {
    vi.resetModules();
    buildProjectMind.mockReset();
    generateText.mockReset();
    buildProjectMind.mockResolvedValue(snapshot);
  });

  test("parses and normalizes AI readiness JSON from the ProjectMind snapshot", async () => {
    generateText.mockResolvedValue(JSON.stringify({
      score: 78,
      label: "Shoot-ready",
      confidence: 0.82,
      summary: "Script is strong enough, but the shoot plan needs B-roll and screen capture beats.",
      stage: "shoot",
      blockers: [
        {
          area: "shoot",
          severity: "high",
          reason: "No B-roll plan is present.",
          suggestedAction: "Add three B-roll beats.",
        },
      ],
      nextActions: [
        {
          title: "Add B-roll",
          command: "/tasks add b-roll beats",
          reason: "The shoot plan is under-specified.",
        },
      ],
      evidence: {
        scriptSignals: ["Hook and CTA exist."],
        shootSignals: ["A-roll exists."],
        assetSignals: ["One generated still exists."],
        publishSignals: ["Caption is missing."],
      },
    }));

    const { analyzeProjectReadiness } = await import("@/lib/agent/readiness/readiness-analysis");
    const analysis = await analyzeProjectReadiness({ projectId: "project-1", modelOverride: "gemini-2.5-flash" });

    expect(buildProjectMind).toHaveBeenCalledWith({ projectId: "project-1" });
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      modelOverride: "gemini-2.5-flash",
      prompt: expect.stringContaining("Return strict JSON only"),
    }));
    expect(analysis).toMatchObject({
      score: 78,
      label: "Shoot-ready",
      confidence: 0.82,
      stage: "shoot",
      fallbackUsed: false,
    });
    expect(analysis.blockers[0].suggestedAction).toContain("B-roll");
  });

  test("falls back to deterministic ProjectMind signals when AI JSON is unavailable", async () => {
    generateText.mockResolvedValue("AI generated placeholder response");

    const { analyzeProjectReadiness } = await import("@/lib/agent/readiness/readiness-analysis");
    const analysis = await analyzeProjectReadiness({ projectId: "project-1" });

    expect(analysis.fallbackUsed).toBe(true);
    expect(analysis.score).toBeGreaterThan(0);
    expect(analysis.summary).toContain("Fallback readiness");
    expect(analysis.blockers.map((blocker) => blocker.area)).toContain("shoot");
    expect(analysis.evidence.scriptSignals.join(" ")).toContain("Script");
  });
});
