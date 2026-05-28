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

  test("“save this to script lab” executes", () => {
    const decision = selectAgentMode({
      rawMessage: "save this outline to the script lab",
    });

    expect(decision.mode).toBe("execute");
    expect(decision.shouldAskQuestion).toBe(false);
    expect(decision.shouldUseTools).toBe(true);
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
