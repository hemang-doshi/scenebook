import { describe, expect, test } from "vitest";

import type { ProjectWorkspace } from "@/lib/data/repository";
import { buildAgentPlan } from "@/lib/agent/runtime-v2/planner";
import type { AgentModeDecision } from "@/lib/agent/runtime-v2/mode-selector";

const executeDecision: AgentModeDecision = {
  mode: "execute",
  confidence: 0.9,
  reason: "User requested direct execution.",
  shouldAskQuestion: false,
  shouldUseTools: true,
};

const baseProject = {
  id: "project-1",
  title: "Desk lighting reel",
  platform: "instagram",
  format: "reel",
  status: "editing",
} as ProjectWorkspace;

describe("Agent Runtime v2 planner", () => {
  test("detailed script prompt creates execution plan", () => {
    const plan = buildAgentPlan({
      modeDecision: {
        ...executeDecision,
        suggestedWorkflow: "script",
      },
      workflow: "script",
      creativeBrief: {
        coreAngle: "Make desk lighting feel achievable without buying more gear.",
        platform: "Instagram",
        durationSeconds: 30,
        format: "talking head",
        tone: "technical",
        cta: "save this setup",
      },
      rawUserMessage: "/script Write a 30 second technical Instagram talking-head script about desk lighting.",
      project: baseProject,
    });

    expect(plan.intent).toBe("execute_tools");
    expect(plan.workflow?.name).toBe("script");
    expect(plan.questions).toHaveLength(0);
    expect(plan.steps.map((step) => step.toolName)).toEqual([
      "generate_script_package",
      "critique_script",
      "update_script_lab",
      "create_project_artifact",
      "update_project_status",
    ]);
  });

  test("vague script prompt asks questions", () => {
    const plan = buildAgentPlan({
      modeDecision: {
        mode: "ask",
        confidence: 0.9,
        reason: "Script request is missing useful context.",
        shouldAskQuestion: true,
        shouldUseTools: false,
      },
      workflow: "script",
      creativeBrief: {},
      rawUserMessage: "/script",
      project: baseProject,
    });

    expect(plan.intent).toBe("ask_questions");
    expect(plan.steps).toHaveLength(0);
    expect(plan.questions.length).toBeGreaterThan(0);
    expect(plan.questions.length).toBeLessThanOrEqual(3);
    expect(plan.missingCreativeFields).toEqual(
      expect.arrayContaining(["coreAngle", "durationSeconds", "tone"]),
    );
  });

  test("asset request creates asset workflow plan", () => {
    const plan = buildAgentPlan({
      modeDecision: executeDecision,
      workflow: "asset_generation",
      creativeBrief: {
        modality: "image",
        creativeDirection: "A premium desk lighting setup with practical lamps and soft shadows.",
        aspectRatio: "9:16",
        visualStyle: "cinematic product tutorial",
      },
      rawUserMessage: "Generate a 9:16 image prompt and asset for the desk lighting reel.",
      project: baseProject,
    });

    expect(plan.intent).toBe("execute_tools");
    expect(plan.workflow?.name).toBe("asset_generation");
    expect(plan.steps.map((step) => step.toolName)).toEqual([
      "generate_prompt_json",
      "create_asset_folder",
      "generate_media_asset",
      "attach_asset_to_project",
    ]);
  });

  test("vague asset request asks high-leverage questions", () => {
    const plan = buildAgentPlan({
      modeDecision: executeDecision,
      rawUserMessage: "generate an image",
      project: baseProject,
    });

    expect(plan.intent).toBe("ask_questions");
    expect(plan.workflow?.name).toBe("asset_generation");
    expect(plan.questions).toEqual([
      "What should the asset show, sound like, or communicate?",
      "Should it feel cinematic, clean SaaS, or raw devlog?",
    ]);
  });

  test("publish step requires approval", () => {
    const plan = buildAgentPlan({
      modeDecision: executeDecision,
      creativeBrief: {
        platform: "Instagram",
        cta: "save this before your next shoot",
      },
      rawUserMessage: "Publish this finished reel to Instagram.",
      project: baseProject,
    });

    const publishStep = plan.steps.find((step) => step.toolName === "publish_to_instagram");

    expect(publishStep).toMatchObject({
      toolName: "publish_to_instagram",
      approvalPolicy: "always",
      requiresApproval: true,
    });
  });
});
