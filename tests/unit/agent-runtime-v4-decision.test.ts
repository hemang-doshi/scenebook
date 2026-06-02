import { describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import { ModelStructuredOutputError } from "@/lib/ai/model-gateway/errors";
import { ModelConfigurationError } from "@/lib/ai/model-gateway/errors";
import type { ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import { decideNextStep } from "@/lib/agent/runtime-v4/decision/decision-engine";
import { checkGoalProgress } from "@/lib/agent/runtime-v4/decision/goal-checker";
import { resolveRuntimeV4ChatModel } from "@/lib/agent/runtime-v4/model";

function queuedStructuredGateway(...responses: unknown[]): ModelGateway & {
  generateStructured: ReturnType<typeof vi.fn>;
  generateText: ReturnType<typeof vi.fn>;
} {
  const queue = [...responses];
  const generateStructured = vi.fn(async (request) => ({
    object: request.schema.parse(queue.shift() ?? responses.at(-1)),
    finishReason: "stop",
  }));

  return {
    provider: "fake",
    generateText: vi.fn(async () => ({ text: "", finishReason: "stop" })),
    generateStructured,
    streamText: vi.fn(async () => ({
      textStream: (async function* stream() {
        yield "";
      })(),
    })),
  };
}

function repairableMalformedGateway(rawText: string, repairedResponse: unknown): ModelGateway & {
  generateStructured: ReturnType<typeof vi.fn>;
  generateText: ReturnType<typeof vi.fn>;
} {
  return {
    provider: "fake",
    generateStructured: vi.fn(async (request) => {
      throw new ModelStructuredOutputError({
        provider: "fake",
        profile: request.profile,
        schemaName: request.schemaName,
        message: "Malformed structured output",
        rawText,
        cause: new Error("Malformed structured output"),
      });
    }),
    generateText: vi.fn(async () => ({
      text: JSON.stringify(repairedResponse),
      finishReason: "stop",
    })),
    streamText: vi.fn(async () => ({
      textStream: (async function* stream() {
        yield "";
      })(),
    })),
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
    const gateway = queuedStructuredGateway({
      type: "ask_question",
      questions: ["Who is the target viewer for this idea?"],
      reason: "The creative request needs audience context.",
      expectedFieldTargets: ["audience"],
    });

    const decision = await decideNextStep({
      message: "make this better",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    });

    expect(["ask_question", "propose_plan"]).toContain(decision.type);
    expect(JSON.stringify(decision)).toMatch(/viewer|audience|plan|step/i);
    expect(gateway.generateStructured).toHaveBeenCalledWith(expect.objectContaining({
      profile: "agent_decision",
      schemaName: "AgentDecision",
    }));
  });

  test("direct script request proposes script workflow", async () => {
    const gateway = queuedStructuredGateway({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "write a punchier script" },
      reason: "The user requested script generation.",
    });

    await expect(decideNextStep({
      message: "write a punchier script",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    })).resolves.toEqual({
      type: "workflow_call",
      workflowName: "create_script_package",
      input: { prompt: "write a punchier script" },
      reason: "The user requested script generation.",
    });
  });

  test("tool observation does not automatically finalize if the goal is incomplete", async () => {
    const gateway = queuedStructuredGateway({
      status: "continue",
      reason: "The script package exists, but the workspace still needs an update.",
    });

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

  test("malformed structured output is repaired when raw text is preserved", async () => {
    const gateway = repairableMalformedGateway(
      "not json",
      {
        type: "final_response",
        response: "I can help shape that into a tighter reel idea.",
        confidence: 0.7,
      },
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
    expect(gateway.generateStructured).toHaveBeenCalledTimes(1);
    expect(gateway.generateText).toHaveBeenCalledTimes(1);
    expect(gateway.generateText.mock.calls[0][0]).toMatchObject({
      profile: "agent_decision",
    });
    expect(gateway.generateText.mock.calls[0][0].prompt).toContain("Repair");
  });

  test("unrecoverable structured output on general chat produces a useful identity response", async () => {
    const gateway = repairableMalformedGateway("not json", "still not json");

    const decision = await decideNextStep({
      message: "who are you",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    });

    expect(decision.type).toBe("final_response");
    if (decision.type !== "final_response") {
      throw new Error(`Expected final_response, received ${decision.type}.`);
    }
    expect(decision.response).toMatch(/scenebook|agent/i);
    expect(decision.response).not.toMatch(/decision model did not return structured output/i);
  });

  test("tool access question fallback answers concretely instead of using the hardcoded helper text", async () => {
    const gateway = repairableMalformedGateway("not json", "still not json");

    const decision = await decideNextStep({
      message: "do you have access to tools",
      snapshot: snapshot(),
      toolSummaries: [{ name: "update_script_lab" }, { name: "create_script_version" }],
      modelGateway: gateway,
    });

    expect(decision).toMatchObject({
      type: "final_response",
    });
    if (decision.type !== "final_response") {
      throw new Error(`Expected final_response, received ${decision.type}.`);
    }
    expect(decision.response).toMatch(/tool/i);
    expect(decision.response).not.toContain("I can still help with that");
  });

  test("slash-command fallback maps script requests to the v4 script workflow", async () => {
    const gateway = repairableMalformedGateway("not json", "still not json");

    const decision = await decideNextStep({
      message: "/script generate a script about a reel talking about AI taking over humans",
      commandHint: "script",
      commandInput: "generate a script about a reel talking about AI taking over humans",
      snapshot: snapshot(),
      toolSummaries: [],
      modelGateway: gateway,
    });

    expect(decision).toEqual({
      type: "workflow_call",
      workflowName: "create_script_package",
      input: { prompt: "generate a script about a reel talking about AI taking over humans" },
      reason: expect.stringMatching(/script/i),
    });
  });
});

describe("runtime-v4 chat model routing", () => {
  test("default chat routing uses the NIM provider", () => {
    expect(resolveRuntimeV4ChatModel()).toMatchObject({
      provider: "nim",
    });
  });

  test("gemini chat routing uses the google provider", () => {
    expect(resolveRuntimeV4ChatModel("gemini-2.5-flash")).toEqual({
      provider: "google",
      model: "gemini-2.5-flash",
    });
  });

  test("openrouter chat routing does not get sent to google", () => {
    expect(resolveRuntimeV4ChatModel("google/gemini-2.5-flash")).toEqual({
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
    });
  });

  test("unsupported chat routing fails before model invocation", () => {
    expect(() => resolveRuntimeV4ChatModel("claude-3.7-sonnet")).toThrow(ModelConfigurationError);
  });
});
