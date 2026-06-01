import { describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import type { ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import { decideNextStep } from "@/lib/agent/runtime-v4/decision/decision-engine";
import { checkGoalProgress } from "@/lib/agent/runtime-v4/decision/goal-checker";

function queuedTextGateway(...responses: string[]): ModelGateway & { generateText: ReturnType<typeof vi.fn> } {
  const queue = [...responses];
  const generateText = vi.fn(async () => {
    return queue.shift() ?? responses.at(-1) ?? "";
  });

  return {
    provider: "fake",
    generateText,
    async generateStructured() {
      throw new Error("These tests use raw structured text parsing.");
    },
    async *streamText() {
      yield "";
    },
  };
}

function snapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  const base: ProjectSnapshot = {
    project: {
      id: "project-1",
      title: "Bronze watch reel",
      platform: "instagram",
      format: "reel",
      status: "idea",
    },
    creativeBrief: null,
    activeGoal: null,
    scriptLab: {
      angle: "",
      hook: "",
      outline: "",
      script: "",
      caption: "",
      onScreenText: "",
      cta: "",
      notes: "",
    },
    scriptVersions: [],
    shootPack: {
      aRoll: [],
      bRoll: [],
      screenCaptures: [],
      props: [],
      missingAssets: [],
      locationNotes: "",
      visualNotes: "",
    },
    assets: {
      count: 0,
      folders: [],
      looseAssetCount: 0,
      recent: [],
    },
    editor: {
      ready: false,
      integrationAvailable: false,
      note: "Editor handoff artifacts are available; timeline writes are not wired yet.",
    },
    publish: {
      ready: false,
      integrationAvailable: false,
      caption: null,
    },
    analytics: null,
    conversation: {
      recentMessages: [],
    },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 0,
      scriptCompleteness: 0,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "ideating",
      missing: ["creative brief", "script"],
    },
  };

  return {
    ...base,
    ...overrides,
  };
}

function observation(overrides: Partial<ToolObservation> = {}): ToolObservation {
  return {
    toolName: "generate_script_package",
    toolCallId: "tool-call-1",
    status: "completed",
    message: "Draft package generated.",
    output: {
      kind: "script_package",
      hook: "A precise hook",
    },
    ...overrides,
  };
}

describe("runtime-v4 decision engine", () => {
  test("vague creative request asks a useful question or proposes a plan", async () => {
    const gateway = queuedTextGateway(JSON.stringify({
      type: "ask_question",
      questions: ["Who is the target viewer for this idea?"],
      reason: "The creative request needs audience context.",
      expectedFieldTargets: ["audience"],
    }));

    const decision = await decideNextStep({
      message: "make this better",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    });

    expect(["ask_question", "propose_plan"]).toContain(decision.type);
    expect(JSON.stringify(decision)).toMatch(/viewer|audience|plan|step/i);
    expect(gateway.generateText).toHaveBeenCalledTimes(1);
  });

  test("direct script request proposes script workflow", async () => {
    const gateway = queuedTextGateway(JSON.stringify({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "write a punchier script" },
      reason: "The user requested script generation.",
    }));

    await expect(decideNextStep({
      message: "write a punchier script",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    })).resolves.toEqual({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "write a punchier script" },
      reason: "The user requested script generation.",
    });
  });

  test("tool observation does not automatically finalize if the goal is incomplete", async () => {
    const gateway = queuedTextGateway(JSON.stringify({
      status: "continue",
      reason: "The script package exists, but the workspace still needs an update.",
    }));

    const result = await checkGoalProgress({
      message: "write and save a script",
      snapshot: snapshot(),
      observations: [observation()],
      modelGateway: gateway,
    });

    expect(result).toEqual({
      status: "continue",
      reason: "The script package exists, but the workspace still needs an update.",
    });
  });

  test("malformed model JSON is repaired", async () => {
    const gateway = queuedTextGateway(
      "not json",
      JSON.stringify({
        type: "final_response",
        response: "I can help shape that into a tighter reel idea.",
        confidence: 0.7,
      }),
    );

    await expect(decideNextStep({
      message: "help me think through this reel",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    })).resolves.toMatchObject({
      type: "final_response",
      response: "I can help shape that into a tighter reel idea.",
    });
    expect(gateway.generateText).toHaveBeenCalledTimes(2);
    expect(gateway.generateText.mock.calls[1][0].prompt).toContain("Repair");
  });

  test("unrecoverable malformed JSON produces graceful fallback", async () => {
    const gateway = queuedTextGateway("not json", "still not json");

    const decision = await decideNextStep({
      message: "help me plan a reel",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    });

    expect(decision.type).toBe("final_response");
    if (decision.type !== "final_response") {
      throw new Error(`Expected final_response, received ${decision.type}.`);
    }
    expect(decision.response).toContain("I can still help");
    expect(decision.response).not.toMatch(/decision model did not return structured output/i);
  });
});
