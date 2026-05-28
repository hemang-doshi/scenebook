import { describe, expect, test } from "vitest";
import {
  extractCreativeBrief,
  mergeCreativeBrief,
  getMissingCreativeFields,
  type CreativeBrief,
} from "@/lib/agent/runtime-v2/creative-brief";
import { buildAgentWorkspaceContext } from "@/lib/agent/runtime-v2/context-loader";

describe("Creative Brief Extractor", () => {
  test("extract duration", () => {
    const brief15 = extractCreativeBrief("I want a 15 sec short video.");
    expect(brief15.duration).toBe("15 sec");
    expect(brief15.durationSeconds).toBe(15);

    const brief30 = extractCreativeBrief("Make it 30s long please.");
    expect(brief30.duration).toBe("30 sec");
    expect(brief30.durationSeconds).toBe(30);

    const brief45 = extractCreativeBrief("Duration should be around 45 seconds.");
    expect(brief45.duration).toBe("45 sec");
    expect(brief45.durationSeconds).toBe(45);

    const brief60 = extractCreativeBrief("A 60sec video is perfect.");
    expect(brief60.duration).toBe("60 sec");
    expect(brief60.durationSeconds).toBe(60);

    const briefNone = extractCreativeBrief("A fast clip.");
    expect(briefNone.duration).toBeUndefined();
    expect(briefNone.durationSeconds).toBeUndefined();
  });

  test("extract platform", () => {
    const b1 = extractCreativeBrief("Create a post for Instagram and tiktok");
    // Tiktok is after Instagram but we match one (Instagram)
    expect(b1.platform).toBe("Instagram");

    const b2 = extractCreativeBrief("Post this to TikTok");
    expect(b2.platform).toBe("TikTok");

    const b3 = extractCreativeBrief("This is a YouTube Shorts script");
    expect(b3.platform).toBe("YouTube Shorts");

    const b4 = extractCreativeBrief("Target LinkedIn professionals");
    expect(b4.platform).toBe("LinkedIn");

    const b5 = extractCreativeBrief("Post to twitter/x");
    expect(b5.platform).toBe("X");
  });

  test("extract tone", () => {
    const b1 = extractCreativeBrief("Tone should be cinematic and premium");
    expect(b1.tone).toBe("cinematic");

    const b2 = extractCreativeBrief("Make it funny or hilarious");
    expect(b2.tone).toBe("funny");

    const b3 = extractCreativeBrief("An unfiltered raw look");
    expect(b3.tone).toBe("raw");

    const b4 = extractCreativeBrief("A detailed technical dev video");
    expect(b4.tone).toBe("technical");

    const b5 = extractCreativeBrief("A touching emotional story");
    expect(b5.tone).toBe("emotional");

    const b6 = extractCreativeBrief("Very polished and clean style");
    expect(b6.tone).toBe("polished");

    const b7 = extractCreativeBrief("Wild and chaotic vibes");
    expect(b7.tone).toBe("chaotic");

    const b8 = extractCreativeBrief("Luxury and premium branding");
    expect(b8.tone).toBe("premium");
  });

  test("extract creator presence and cta", () => {
    const b1 = extractCreativeBrief("This should be faceless with voiceover. CTA: subscribe to my channel");
    expect(b1.creatorPresence).toBe("no face");
    expect(b1.cta).toBe("subscribe to my channel");

    const b2 = extractCreativeBrief("On-camera face video. Call to action: visit website.");
    expect(b2.creatorPresence).toBe("face");
    expect(b2.cta).toBe("visit website");
  });

  test("merge brief", () => {
    const existing: CreativeBrief = {
      platform: "Instagram",
      duration: "15 sec",
      durationSeconds: 15,
      tone: "cinematic",
    };

    const extracted: CreativeBrief = {
      duration: "30 sec",
      durationSeconds: 30,
      tone: undefined, // no change
      platform: undefined, // no change
      cta: "visit store", // new addition
    };

    const merged = mergeCreativeBrief(existing, extracted);
    expect(merged.platform).toBe("Instagram");
    expect(merged.duration).toBe("30 sec");
    expect(merged.durationSeconds).toBe(30);
    expect(merged.tone).toBe("cinematic");
    expect(merged.cta).toBe("visit store");
  });

  test("calculate missing fields for script workflow", () => {
    const brief: CreativeBrief = {
      platform: "TikTok",
      durationSeconds: 30,
      tone: "funny",
      cta: "click bio link",
    };

    const missing = getMissingCreativeFields(brief, "script");
    expect(missing).toContain("contentGoal");
    expect(missing).toContain("coreAngle");
    expect(missing).toContain("format");
    expect(missing).toContain("viewerEmotion");
    expect(missing).not.toContain("platform");
    expect(missing).not.toContain("durationSeconds");
    expect(missing).not.toContain("tone");
    expect(missing).not.toContain("cta");

    const otherWorkflow = getMissingCreativeFields(brief, "other");
    expect(otherWorkflow).toHaveLength(0);
  });
});

describe("Context Loader", () => {
  test("builds structured compact workspace context", () => {
    const project = {
      title: "How to Code AI",
      format: "talking head",
      platform: "YouTube",
      status: "draft",
    };

    const messages = [
      { role: "user", content: "Hi agent!" },
      { role: "assistant", content: "Hello! How can I help you create content today?" },
    ];

    const toolCalls = [
      { tool_name: "Script Builder", command: "script", status: "completed" },
    ];

    const creativeBrief: CreativeBrief = {
      platform: "YouTube Shorts",
      durationSeconds: 60,
      tone: "technical",
    };

    const activeGoal = {
      id: "goal-1",
      owner_id: "user-1",
      project_id: "project-1",
      thread_id: "thread-1",
      title: "Write final script draft",
      status: "active",
      completed_steps: ["Outline the hook"],
      next_actions: ["Draft body paragraphs", "Add CTA"],
      metadata: {},
    };

    const context = buildAgentWorkspaceContext(
      project,
      messages,
      toolCalls,
      creativeBrief,
      activeGoal
    );

    expect(context).toContain("=== PROJECT INFO ===");
    expect(context).toContain("Title: How to Code AI");
    expect(context).toContain("=== CREATIVE BRIEF ===");
    expect(context).toContain("platform: YouTube Shorts");
    expect(context).toContain("tone: technical");
    expect(context).toContain("=== ACTIVE GOAL ===");
    expect(context).toContain("Goal: Write final script draft");
    expect(context).toContain("Completed Steps: [\"Outline the hook\"]");
    expect(context).toContain("=== RECENT MESSAGES ===");
    expect(context).toContain("[user]: Hi agent!");
    expect(context).toContain("=== RECENT TOOL CALLS ===");
    expect(context).toContain("Tool: Script Builder (/script) - completed");
  });
});
