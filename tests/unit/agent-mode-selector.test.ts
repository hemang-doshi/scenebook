import { describe, expect, test } from "vitest";
import { selectAgentMode } from "@/lib/agent/runtime-v2/mode-selector";

describe("Agent Mode Selector", () => {
  test("vague script request asks questions", () => {
    const decision = selectAgentMode({
      rawMessage: "/script",
      parsedSlashCommand: "script",
      missingCreativeFields: ["contentGoal", "coreAngle", "platform", "tone"],
    });

    expect(decision.mode).toBe("ask");
    expect(decision.shouldAskQuestion).toBe(true);
    expect(decision.shouldUseTools).toBe(false);
    expect(decision.questions?.length).toBeLessThanOrEqual(3);
    expect(decision.questions?.[0]).toContain("viewer to take away");
  });

  test("detailed /script executes", () => {
    const decision = selectAgentMode({
      rawMessage: "/script Create a cinematic 30s video about AI safety for TikTok. CTA is visit our site",
      parsedSlashCommand: "script",
      missingCreativeFields: [],
    });

    expect(decision.mode).toBe("execute");
    expect(decision.shouldAskQuestion).toBe(false);
    expect(decision.shouldUseTools).toBe(true);
    expect(decision.suggestedWorkflow).toBe("script");
  });

  test("“I don’t know the angle” brainstorms", () => {
    const decision = selectAgentMode({
      rawMessage: "I don't know the angle for my video. Give me some options.",
    });

    expect(decision.mode).toBe("brainstorm");
    expect(decision.shouldAskQuestion).toBe(false);
    expect(decision.shouldUseTools).toBe(false);
  });

  test("“plan this reel” plans", () => {
    const decision = selectAgentMode({
      rawMessage: "please plan this reel campaign",
    });

    expect(decision.mode).toBe("plan");
    expect(decision.shouldAskQuestion).toBe(false);
    expect(decision.shouldUseTools).toBe(false);
  });

  test("end-to-end request selects persistent goal mode", () => {
    const decision = selectAgentMode({
      rawMessage: "Help me make this reel end-to-end from idea to publish",
    });

    expect(decision.mode).toBe("goal");
    expect(decision.goalStageUpdate).toBe("ideating");
    expect(decision.shouldUseTools).toBe(false);
  });

  test("active goal progress message suggests asset planning stage", () => {
    const decision = selectAgentMode({
      rawMessage: "The script is done and saved.",
      activeGoal: {
        id: "goal-1",
        owner_id: "user-1",
        project_id: "project-1",
        thread_id: "thread-1",
        title: "Launch reel",
        status: "active",
        completed_steps: [],
        next_actions: [],
        metadata: { stage: "scripting" },
      },
    });

    expect(decision.mode).toBe("goal");
    expect(decision.goalStageUpdate).toBe("asset_planning");
  });

  test("“save this to script lab” executes", () => {
    const decision = selectAgentMode({
      rawMessage: "save this outline to the script lab",
    });

    expect(decision.mode).toBe("execute");
    expect(decision.shouldAskQuestion).toBe(false);
    expect(decision.shouldUseTools).toBe(true);
  });

  test.each([
    "generate an image of the desk setup",
    "make a thumbnail for this reel",
    "create b-roll of the product detail",
    "give me a voiceover for the hook",
  ])("%s enters asset generation workflow", (rawMessage) => {
    const decision = selectAgentMode({ rawMessage });

    expect(decision.mode).toBe("execute");
    expect(decision.shouldUseTools).toBe(true);
    expect(decision.suggestedWorkflow).toBe("asset_generation");
  });

  test("“critique this” reviews", () => {
    const decision = selectAgentMode({
      rawMessage: "critique this hook and suggest improvements",
    });

    expect(decision.mode).toBe("review");
    expect(decision.shouldAskQuestion).toBe(false);
    expect(decision.shouldUseTools).toBe(false);
  });
});
