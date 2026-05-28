import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProjectWorkspace } from "@/lib/data/repository";

const appendAgentMessage = vi.fn();
const completeAgentRun = vi.fn();
const completeAgentToolCall = vi.fn();
const createAgentRun = vi.fn();
const createAgentToolCall = vi.fn();
const createOrLoadThread = vi.fn();
const createSupabaseServerClient = vi.fn();
const failAgentRun = vi.fn();
const failAgentToolCall = vi.fn();
const generateText = vi.fn();
const generateTextStream = vi.fn().mockImplementation(async function* () {
  yield "chunk 1 ";
  yield "chunk 2";
});
const getProjectWorkspace = vi.fn();
const getAgentHistory = vi.fn();
const getAgentToolCall = vi.fn();
const listAgentThreads = vi.fn();
const generateProjectMedia = vi.fn();
const getLatestProjectMemory = vi.fn().mockResolvedValue(null);
const createMemorySnapshot = vi.fn();
const createProjectArtifact = vi.fn();
const updateCard = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  generateText,
  generateTextStream,
}));

vi.mock("@/lib/generation/generate-media", () => ({
  generateProjectMedia,
}));

vi.mock("@/lib/agent/runtime", () => ({
  appendAgentMessage,
  completeAgentRun,
  completeAgentToolCall,
  createAgentRun,
  createAgentToolCall,
  createOrLoadThread,
  failAgentRun,
  failAgentToolCall,
  getAgentHistory,
  getAgentToolCall,
  listAgentThreads,
}));

vi.mock("@/lib/agent/memory", () => ({
  getLatestProjectMemory,
  createMemorySnapshot,
}));

vi.mock("@/lib/agent/artifacts", () => ({
  createProjectArtifact,
}));

vi.mock("@/lib/data/repository", () => ({
  getProjectWorkspace,
  updateCard,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

const baseProject: ProjectWorkspace = {
  id: "project-1",
  ownerId: "user-1",
  inboxItemId: null,
  title: "Bronze watch hero reel",
  status: "posted",
  format: "reel",
  platform: "instagram",
  topicTags: [],
  experimentTags: [],
  scriptLab: {
    angle: "Show the watch as a tactile luxury object.",
    hook: "",
    outline: "",
    script: "",
    caption: "",
    onScreenText: "",
    cta: "",
    notes: "",
  },
  shootPack: {
    aRoll: [],
    bRoll: [],
    screenCaptures: [],
    props: [],
    missingAssets: [],
    locationNotes: "",
    visualNotes: "",
  },
  analyticsJournal: {
    views: 1200,
    likes: 80,
    comments: 12,
    shares: 10,
    saves: 22,
    watchTimeNote: "",
    reflection: "The strongest retention came from the first close-up.",
    decision: "repeat",
    followUpIdea: "Make a sequel focused on the clasp detail.",
  },
  aiSuggestions: {
    hooks: [],
    captions: [],
    rewrites: [],
    shotList: [],
    followUps: [],
    performanceSummary: "Close on the product payoff earlier.",
  },
  assets: [],
  readiness: {
    score: 0,
    label: "Needs work",
    missing: [],
  },
  generations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createAuthSupabase() {
  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: "user-1" },
        },
      }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  });
}

describe("agent tools", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    appendAgentMessage.mockReset();
    completeAgentRun.mockReset();
    completeAgentToolCall.mockReset();
    createAgentRun.mockReset();
    createAgentToolCall.mockReset();
    createOrLoadThread.mockReset();
    createSupabaseServerClient.mockReset();
    failAgentRun.mockReset();
    failAgentToolCall.mockReset();
    generateText.mockReset();
    generateTextStream.mockClear();
    getProjectWorkspace.mockReset();
    getAgentHistory.mockReset();
    getAgentToolCall.mockReset();
    listAgentThreads.mockReset();
    generateProjectMedia.mockReset();
    getLatestProjectMemory.mockResolvedValue(null);
    createMemorySnapshot.mockReset();
    createProjectArtifact.mockReset();
    updateCard.mockReset();
  });

  test("/form-json-prompt returns targeted questions for vague prompts", async () => {
    const { formJsonPromptTool } = await import("@/lib/agent/tools/form-json-prompt");
    const result = await formJsonPromptTool.handler(
      { projectId: "p1", threadId: "t1", runId: "r1", rawInput: "/form-json-prompt beach", project: baseProject, selectedModel: null },
      { prompt: "beach" },
    );

    expect(result.status).toBe("awaiting_input");
    expect(result.output).toMatchObject({
      kind: "prompt_questions",
      original_prompt: "beach",
      questions: expect.arrayContaining([expect.stringContaining("How old")]),
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  test("/form-json-prompt returns strict prompt JSON for detailed prompts", async () => {
    generateText.mockResolvedValue(`{
      "modality":"image",
      "prompt":"Children playing tag at a Goa beach during sunset with candid motion and warm shoreline glow.",
      "aspect_ratio":"9:16",
      "subject":{"primary":"Children","age":"4-5","wardrobe":"casual summer attire","action":"playing tag"},
      "scene":{"location":"Goa beach shoreline","time_of_day":"sunset","environment":"open beach with wet sand and ocean horizon","atmosphere":"warm, playful, cinematic"},
      "camera":{"shot_type":"medium wide","angle":"eye-level","framing":"vertical hero frame","movement":"handheld tracking","focus":"children in motion with soft background separation"},
      "lighting":{"style":"golden-hour natural light","quality":"soft and warm","direction":"backlit from the sunset"},
      "style":{"aesthetic":"cinematic lifestyle","color_palette":"warm oranges and ocean blues"},
      "output":{"width":1024,"height":1792,"duration_seconds":8}
    }`);

    const { formJsonPromptTool } = await import("@/lib/agent/tools/form-json-prompt");
    const result = await formJsonPromptTool.handler(
      { projectId: "p1", threadId: "t1", runId: "r1", rawInput: "/form-json-prompt children playing at a beach sunset in Goa", project: baseProject, selectedModel: null },
      { prompt: "children playing at a beach sunset in Goa\nage 4-5\ncasual summer attire\nplaying tag" },
    );

    expect(result.output).toMatchObject({
      kind: "prompt_json",
      modality: "image",
      prompt: expect.stringContaining("Goa beach"),
      subject: { age: "4-5" },
      scene: { location: expect.stringContaining("Goa") },
      camera: { movement: expect.stringContaining("tracking") },
      output: { duration_seconds: 8 },
    });
  });

  test("Goa follow-up prompt keeps the user's visual request primary", async () => {
    generateText.mockResolvedValue(`{"modality":"image","prompt":"Children aged 4-5 playing tag on a Goa beach at sunset, casual summer attire, candid motion, warm shoreline light.","negative_prompt":"meadow, studio set, adult creator, production meeting","aspect_ratio":"9:16"}`);

    const { formJsonPromptTool } = await import("@/lib/agent/tools/form-json-prompt");
    const combinedPrompt = [
      "Original request: children playing at a beach sunset in Goa",
      "Follow-up answers: 4-5, casual summer attire, playing tag",
    ].join("\n");

    const result = await formJsonPromptTool.handler(
      { projectId: "p1", threadId: "t1", runId: "r1", rawInput: combinedPrompt, project: baseProject, selectedModel: null },
      { prompt: combinedPrompt },
    );

    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("children playing at a beach sunset in Goa"),
    }));
    expect(result.output).toMatchObject({
      kind: "prompt_json",
      prompt: expect.stringContaining("Goa beach"),
      negative_prompt: expect.stringContaining("meadow"),
    });
  });

  test("/script returns draft structured output without syncing scriptLab", async () => {
    generateText.mockResolvedValue(`{"hook":"Stop shooting your watch like this.","outline":["Hook","Problem","Payoff","CTA"],"script":"Voiceover text","caption":"Caption text","cta":"Save this for your next shoot.","onScreenText":["Luxury detail","Macro payoff"]}`);

    const { scriptTool } = await import("@/lib/agent/tools/script");
    const result = await scriptTool.handler(
      { projectId: "project-1", threadId: "thread-1", runId: "run-1", rawInput: "/script launch a luxury watch reel", project: baseProject, selectedModel: null },
      { prompt: "launch a luxury watch reel" },
    );

    expect(result.output).toMatchObject({
      kind: "script_package",
      hook: expect.stringContaining("Stop shooting"),
    });
    expect(result.status).toBe("awaiting_approval");
    expect(updateCard).not.toHaveBeenCalled();
  });

  test("/script accepts the legacy nested scriptLab JSON shape", async () => {
    generateText.mockResolvedValue(`Here is the package:

\`\`\`json
{
  "scriptLab": {
    "hook": "Stop hiding the hero detail.",
    "outline": ["Hook", "Texture", "Payoff", "CTA"],
    "script": "Voiceover with visual notes",
    "caption": "Caption copy",
    "cta": "Save this shot list.",
    "onScreenText": ["Macro texture", "Hero payoff"]
  }
}
\`\`\``);

    const { scriptTool } = await import("@/lib/agent/tools/script");
    const result = await scriptTool.handler(
      { projectId: "project-1", threadId: "thread-1", runId: "run-1", rawInput: "/script launch a luxury watch reel", project: baseProject, selectedModel: null },
      { prompt: "launch a luxury watch reel" },
    );

    expect(result.output).toMatchObject({
      kind: "script_package",
      hook: "Stop hiding the hero detail.",
      outline: ["Hook", "Texture", "Payoff", "CTA"],
      script: "Voiceover with visual notes",
      caption: "Caption copy",
      cta: "Save this shot list.",
      onScreenText: ["Macro texture", "Hero payoff"],
    });
  });

  test("/tasks returns a draft task plan without persisting memory", async () => {
    getLatestProjectMemory.mockResolvedValue({ metadata: { tasks: { preProduction: ["Scout beach"] }, ideas: ["Use slow motion"] } });
    generateText.mockResolvedValue(`{"summary":"Updated beach production plan","tasks":{"preProduction":["Confirm child talent permits"],"shoot":["Capture tag action"],"edit":["Trim to 15 seconds"],"publish":["Post at sunset hour"]},"ideas":["Add shoreline footsteps SFX"]}`);

    const { tasksTool } = await import("@/lib/agent/tools/tasks");
    const result = await tasksTool.handler(
      { projectId: "project-1", threadId: "thread-1", runId: "run-1", rawInput: "/tasks update plan", project: baseProject, selectedModel: null },
      { prompt: "update plan" },
    );

    expect(result.output).toMatchObject({
      kind: "task_plan",
      tasks: { shoot: ["Capture tag action"] },
    });
    expect(result.status).toBe("awaiting_approval");
    expect(createMemorySnapshot).not.toHaveBeenCalled();
  });

  test("/instagram returns a structured instagram plan", async () => {
    generateText.mockResolvedValue(`{"summary":"Post tonight.","caption":"Sunset tag energy in Goa.","hashtags":["#goareels"],"checklist":["Confirm thumbnail","Schedule post"]}`);

    const { instagramTool } = await import("@/lib/agent/tools/instagram");
    const result = await instagramTool.handler(
      { projectId: "project-1", threadId: "thread-1", runId: "run-1", rawInput: "/instagram prepare publish", project: baseProject, selectedModel: null },
      { prompt: "prepare publish" },
    );

    expect(result.output).toMatchObject({
      kind: "instagram_plan",
      caption: "Sunset tag energy in Goa.",
      hashtags: ["#goareels"],
    });
  });

  test("/generate-image accepts prompt JSON input and forwards parsed args", async () => {
    createAuthSupabase();
    generateProjectMedia.mockResolvedValue({
      generationId: "gen-123",
      assetId: "asset-123",
      url: "https://example.com/asset.png",
      folderId: "folder-123",
      folderName: "MockFolder",
      model: "flux-custom",
      provider: "auto",
      prompt: "Children playing tag at a Goa beach during sunset.",
    });

    const { generateImageTool } = await import("@/lib/agent/tools/generate");
    const jsonPrompt = JSON.stringify({
      kind: "prompt_json",
      modality: "image",
      prompt: "Children playing tag at a Goa beach during sunset.",
      negative_prompt: "blur, extra limbs",
      aspect_ratio: "9:16",
      parameters: { subject_age: "4-5", wardrobe: "casual summer attire" },
    });

    const result = await generateImageTool.handler(
      {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        rawInput: `/generate-image ${jsonPrompt}`,
        project: baseProject,
        selectedModel: "gemini-2.5-flash",
        selectedModels: { chat: "gemini-2.5-flash", image: "flux-custom" },
      },
      { prompt: jsonPrompt },
    );

    expect(generateProjectMedia).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      userId: "user-1",
      prompt: "Children playing tag at a Goa beach during sunset.",
      modality: "image",
      modelId: "flux-custom",
      negativePrompt: "blur, extra limbs",
      parameters: { subject_age: "4-5", wardrobe: "casual summer attire" },
    }));
    expect(result.output).toMatchObject({ kind: "media_asset", modality: "image" });
  });

  test("/generate-video preserves structured prompt fields and compiles them into the generation request", async () => {
    createAuthSupabase();
    generateProjectMedia.mockResolvedValue({
      generationId: "gen-video-1",
      assetId: "asset-video-1",
      url: "https://example.com/asset.mp4",
      folderId: "folder-video-1",
      folderName: "MockFolder",
      model: "tencent/HunyuanVideo",
      provider: "auto",
      prompt: "compiled prompt",
    });

    const { generateVideoTool } = await import("@/lib/agent/tools/generate");
    const jsonPrompt = JSON.stringify({
      kind: "prompt_json",
      modality: "video",
      prompt: "A low-angle video shot along a beach highway, with a car cruising past the camera and revealing the sunset ocean view.",
      aspect_ratio: "9:16",
      subject: {
        primary: "sports car",
        action: "cruising fast past camera",
        color: "glossy black",
      },
      scene: {
        location: "beach highway",
        time_of_day: "sunset",
        environment: "ocean visible beyond the road",
        atmosphere: "cinematic and expansive",
      },
      camera: {
        shot_type: "low-angle roadside tracking reveal",
        angle: "road-level low angle",
        framing: "car enters foreground then clears frame to expose horizon",
        movement: "static camera with high-speed pass-by",
      },
      lighting: {
        style: "natural sunset light",
      },
      output: {
        width: 1024,
        height: 1792,
        duration_seconds: 8,
      },
    });

    await generateVideoTool.handler(
      {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        rawInput: `/generate-video ${jsonPrompt}`,
        project: baseProject,
        selectedModel: "gemini-2.5-flash",
        selectedModels: { chat: "gemini-2.5-flash", video: "tencent/HunyuanVideo" },
      },
      { prompt: jsonPrompt },
    );

    expect(generateProjectMedia).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      userId: "user-1",
      modality: "video",
      modelId: "tencent/HunyuanVideo",
      prompt: expect.stringContaining("beach highway"),
      structuredPrompt: expect.objectContaining({
        camera: expect.objectContaining({ angle: "road-level low angle" }),
        output: expect.objectContaining({ duration_seconds: 8 }),
      }),
    }));
  });

  test("/script routes through the streaming tool runner and creates a persisted draft tool call", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    getProjectWorkspace.mockResolvedValue(baseProject);
    generateText.mockResolvedValue(`{"hook":"Hook","outline":["One"],"script":"Script","caption":"Caption","cta":"CTA","onScreenText":["Text"]}`);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "/script create a funny promo for a workspace tool",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const events = await readSseEvents(response);
    const toolEvents = events.filter((event) => event.type === "tool");
    expect(toolEvents[0]?.tool).toMatchObject({
      id: "tool-call-1",
      command: "script",
      status: "running",
      toolName: "Script Builder",
      result: { output: { kind: "tool_progress", activity: "drafting" } },
    });
    expect(toolEvents.at(-1)?.tool).toMatchObject({
      id: "tool-call-1",
      command: "script",
      status: "awaiting_approval",
      toolName: "Script Builder",
    });
    expect(createAgentToolCall).toHaveBeenCalledWith(expect.objectContaining({ command: "script" }));
  });

  test("/script streams markdown and emits a draft tool event", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    completeAgentToolCall.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    generateText.mockResolvedValue(`{"hook":"Hook","outline":["One"],"script":"Script","caption":"Caption","cta":"CTA","onScreenText":["Text"]}`);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "/script create a funny promo for a workspace tool",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const events = await readSseEvents(response);
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(["meta", "chunk", "tool"]));
    expect(events.filter((event) => event.type === "tool").at(-1)).toMatchObject({
      tool: {
        id: "tool-call-1",
        command: "script",
        status: "awaiting_approval",
        toolName: "Script Builder",
      },
    });
  });

  test("malformed model output for structured streaming commands emits visible repair progress", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    completeAgentToolCall.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    generateText
      .mockResolvedValueOnce(`Here is the storyboard:\n- Shot 1 audio: crisp click\n- Shot 2 not JSON`)
      .mockResolvedValueOnce(`{"summary":"Repaired storyboard","shots":[{"title":"Shot 1","framing":"Tight frame","camera_movement":"Slow push","lighting":"Soft key","audio":"Crisp click"}]}`);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "/storyboard crisp product launch storyboard",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const events = await readSseEvents(response);
    expect(events.find((event) => event.type === "tool" && event.tool?.result?.output?.activity === "repairing schema")).toMatchObject({
      tool: {
        command: "storyboard",
        status: "running",
      },
    });
    expect(events.filter((event) => event.type === "tool").at(-1)).toMatchObject({
      tool: {
        command: "storyboard",
        status: "awaiting_approval",
        result: {
          output: {
            kind: "storyboard",
            summary: "Repaired storyboard",
          },
        },
      },
    });
    expect(generateText).toHaveBeenCalledTimes(2);
  });

  test.each([
    ["/form-json-prompt", "children aged 4-5 playing tag on a Goa beach at sunset wearing casual summer clothes"],
    ["/tasks", "refresh the production checklist"],
    ["/analyze", "review performance risks"],
    ["/script", "write a launch script"],
  ])("%s malformed structured output fails after visible repair attempt", async (command, prompt) => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    completeAgentToolCall.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    generateText.mockResolvedValue("not valid JSON");

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: `${command} ${prompt}`,
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const events = await readSseEvents(response);
    expect(events.find((event) => event.type === "tool" && event.tool?.result?.output?.activity === "repairing schema")).toBeTruthy();
    expect(events.filter((event) => event.type === "tool").at(-1)?.tool).toMatchObject({
      status: "failed",
      errorMessage: expect.stringContaining("valid JSON"),
    });
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(updateCard).not.toHaveBeenCalled();
    expect(createMemorySnapshot).not.toHaveBeenCalled();
  });

  test.each([
    "/script write a launch script",
    "/form-json-prompt children aged 4-5 playing tag on a Goa beach at sunset wearing casual summer clothes",
    "/storyboard build the launch sequence",
    "/tasks update the production plan",
    "/instagram prepare publishing",
    "/analyze review the project",
    "/import-to-editor hand this to the editor",
    "/export make a vertical delivery plan",
  ])("%s returns text/event-stream", async (message) => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    completeAgentToolCall.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    generateText.mockResolvedValue(`{"hook":"Hook","outline":["One"],"script":"Script","caption":"Caption","cta":"CTA","onScreenText":["Text"],"summary":"Summary","caption":"Caption","hashtags":["#tag"],"checklist":["Check"],"tasks":{"preProduction":["Plan"],"shoot":["Shoot"],"edit":["Edit"],"publish":["Publish"]},"ideas":["Idea"],"strengths":["Strength"],"risks":["Risk"],"next_steps":["Next"],"shots":[{"title":"Shot","framing":"Frame","camera_movement":"Move","lighting":"Light","audio":"Audio"}],"modality":"image","prompt":"Detailed visual prompt","aspect_ratio":"9:16"}`);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message,
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
  });

  test("pending awaiting_input replies resume the same tool call", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    getProjectWorkspace.mockResolvedValue(baseProject);
    getAgentHistory.mockResolvedValue({
      thread: { id: "thread-1" },
      messages: [],
      toolCalls: [
        {
          id: "tool-call-1",
          tool_name: "Form JSON Prompt",
          command: "form-json-prompt",
          status: "awaiting_input",
          requires_approval: false,
          output: { kind: "prompt_questions", original_prompt: "children playing at a beach sunset in Goa" },
        },
      ],
    });
    generateText.mockResolvedValue(`{"modality":"image","prompt":"Children aged 4-5 playing tag on a Goa beach at sunset.","aspect_ratio":"9:16"}`);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "4-5, casual summer attire, playing tag",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const events = await readSseEvents(response);
    const toolEvent = events.filter((event) => event.type === "tool").at(-1);
    expect(toolEvent?.tool).toMatchObject({ id: "tool-call-1", command: "form-json-prompt", status: "awaiting_approval" });
    expect(createAgentToolCall).not.toHaveBeenCalled();
    expect(completeAgentToolCall).toHaveBeenCalledWith(
      "tool-call-1",
      expect.objectContaining({ kind: "prompt_json" }),
      "awaiting_approval",
    );
  });

  test("PATCH apply for script writes scriptLab from the draft output", async () => {
    createAuthSupabase();
    getAgentToolCall.mockResolvedValue({
      id: "tool-call-1",
      project_id: "project-1",
      thread_id: "thread-1",
      command: "script",
      output: {
        kind: "script_package",
        hook: "Stop app hopping.",
        outline: ["Hook", "Problem", "Payoff", "CTA"],
        script: "SceneBook keeps the reel plan connected.",
        caption: "Stop scattering your video workflow.",
        cta: "Save this before your next shoot.",
        onScreenText: ["Stop the chaos", "Creative continuity"],
      },
    });
    getProjectWorkspace.mockResolvedValue(baseProject);
    updateCard.mockResolvedValue(baseProject);
    completeAgentToolCall.mockResolvedValue({});

    const { PATCH } = await import("@/app/api/projects/[id]/agent/route");
    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "PATCH",
        body: JSON.stringify({
          toolCallId: "11111111-1111-4111-8111-111111111111",
          action: "apply",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateCard).toHaveBeenCalledWith("project-1", {
      scriptLab: expect.objectContaining({
        hook: "Stop app hopping.",
        outline: "Hook\nProblem\nPayoff\nCTA",
        script: "SceneBook keeps the reel plan connected.",
      }),
    });
    expect(completeAgentToolCall).toHaveBeenCalledWith(
      "tool-call-1",
      expect.objectContaining({ kind: "script_package" }),
      "approved",
    );
  });

  test("PATCH apply for prompt JSON creates a project artifact", async () => {
    createAuthSupabase();
    getAgentToolCall.mockResolvedValue({
      id: "tool-call-2",
      project_id: "project-1",
      thread_id: "thread-1",
      command: "form-json-prompt",
      output: {
        kind: "prompt_json",
        modality: "image",
        prompt: "A vertical cinematic SceneBook product hero frame.",
        aspect_ratio: "9:16",
      },
    });
    createProjectArtifact.mockResolvedValue({ id: "artifact-1" });
    completeAgentToolCall.mockResolvedValue({});

    const { PATCH } = await import("@/app/api/projects/[id]/agent/route");
    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "PATCH",
        body: JSON.stringify({
          toolCallId: "11111111-1111-4111-8111-111111111112",
          action: "apply",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createProjectArtifact).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      toolCallId: "tool-call-2",
      artifactType: "prompt_json",
      payload: expect.objectContaining({ kind: "prompt_json" }),
    }));
    expect(completeAgentToolCall).toHaveBeenCalledWith(
      "tool-call-2",
      expect.objectContaining({ kind: "prompt_json" }),
      "approved",
    );
  });

  test("/import-to-editor and /export are registered streaming commands", async () => {
    const { isSupportedAgentCommand, listSupportedAgentCommands } = await import("@/lib/agent/tools/registry");

    expect(isSupportedAgentCommand("import-to-editor")).toBe(true);
    expect(isSupportedAgentCommand("export")).toBe(true);
    expect(listSupportedAgentCommands()).toEqual([
      "/script",
      "/form-json-prompt",
      "/generate",
      "/generate-image",
      "/generate-video",
      "/generate-audio",
      "/storyboard",
      "/tasks",
      "/instagram",
      "/analyze",
      "/import-to-editor",
      "/export",
    ]);
  });

  test("media generation failures return failed tool payloads instead of 400", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    completeAgentToolCall.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    generateProjectMedia.mockRejectedValue(
      Object.assign(new Error("No Inference Provider available for model OuteAI/OuteTTS-0.3-500M."), {
        model: "OuteAI/OuteTTS-0.3-500M",
        provider: "huggingface",
      }),
    );

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "/generate-audio confident product launch voiceover",
          models: { audio: "OuteAI/OuteTTS-0.3-500M" },
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.tool).toMatchObject({
      id: "tool-call-1",
      command: "generate-audio",
      status: "failed",
      result: {
        output: {
          kind: "media_error",
          modality: "audio",
          model: "OuteAI/OuteTTS-0.3-500M",
          recoverable: true,
        },
      },
    });
  });

  test("supported plain chat still streams SSE", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    getAgentHistory.mockResolvedValue({ thread: { id: "thread-1" }, messages: [], toolCalls: [] });

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "Help me brainstorm a better opening shot",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(createAgentToolCall).not.toHaveBeenCalled();
  });

  test("GET returns an explicit setup error when agent runtime persistence is unavailable", async () => {
    createAuthSupabase();
    listAgentThreads.mockRejectedValue(new Error('relation "agent_threads" does not exist'));
    getAgentHistory.mockRejectedValue(new Error('relation "agent_threads" does not exist'));

    const { GET } = await import("@/app/api/projects/[id]/agent/route");

    const listResponse = await GET(
      new Request("http://localhost/api/projects/project-1/agent?listThreads=true"),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const listPayload = await listResponse.json();
    expect(listResponse.status).toBe(503);
    expect(listPayload).toMatchObject({
      code: "agent_runtime_not_setup",
    });

    const historyResponse = await GET(
      new Request("http://localhost/api/projects/project-1/agent?threadId=11111111-1111-4111-8111-111111111111"),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const historyPayload = await historyResponse.json();
    expect(historyResponse.status).toBe(503);
    expect(historyPayload).toMatchObject({
      code: "agent_runtime_not_setup",
    });
  });

  test("POST returns an explicit setup error when agent runtime persistence is unavailable", async () => {
    createAuthSupabase();
    createOrLoadThread.mockRejectedValue(new Error('relation "agent_threads" does not exist'));
    getProjectWorkspace.mockResolvedValue(baseProject);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          message: "Help me brainstorm a better opening shot",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "agent_runtime_not_setup",
    });
  });

  test("GET rejects non-UUID thread ids", async () => {
    createAuthSupabase();

    const { GET } = await import("@/app/api/projects/[id]/agent/route");
    const response = await GET(
      new Request("http://localhost/api/projects/project-1/agent?threadId=legacy-project-history"),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("Invalid UUID"),
    });
  });

  test("listThreads=true reads only agent threads", async () => {
    createAuthSupabase();
    listAgentThreads.mockResolvedValue([
      { id: "thread-1", title: "Latest thread", updated_at: "2026-05-28T10:00:00.000Z" },
    ]);

    const { GET } = await import("@/app/api/projects/[id]/agent/route");
    const response = await GET(
      new Request("http://localhost/api/projects/project-1/agent?listThreads=true"),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(listAgentThreads).toHaveBeenCalledWith("project-1");
    expect(getProjectWorkspace).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      threads: [{ id: "thread-1", title: "Latest thread" }],
    });
  });

  test("route does not import the legacy project message writer", async () => {
    vi.resetModules();
    vi.doMock("@/lib/project-service", () => {
      throw new Error("legacy project service should not be imported");
    });

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    completeAgentRun.mockResolvedValue({});
    getProjectWorkspace.mockResolvedValue(baseProject);
    getAgentHistory.mockResolvedValue({ thread: { id: "thread-1" }, messages: [], toolCalls: [] });

    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          message: "Help me brainstorm a better opening shot",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
  });
});

async function readSseEvents(response: Response) {
  const text = await response.text();
  return text
    .split("\n\n")
    .map((packet) => packet.trim())
    .filter(Boolean)
    .map((packet) => packet.replace(/^data:\s*/, ""))
    .map((packet) => JSON.parse(packet));
}
