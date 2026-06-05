import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { AgentChatIsland } from "@/components/agent/agent-chat-island";
import { ModelAccordion } from "@/components/agent/model-accordion";
import { getVisibleCommands, SlashCommandMenu } from "@/components/agent/slash-command-menu";
import { ToolCallCard } from "@/components/agent/tool-call-card";
import type { ProjectWorkspace } from "@/lib/data/repository";

const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

vi.mock("@/components/agent/agent-composer", () => ({
  AgentComposer: ({
    value,
    onChange,
    onSubmit,
    onQuickCommand,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onQuickCommand: (command: string) => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "chat-composer" },
      React.createElement("input", {
        "aria-label": "composer",
        value,
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      }),
      React.createElement(
        "button",
        { type: "button", onClick: () => onQuickCommand("/script") },
        "Mock quick script",
      ),
      React.createElement(
        "button",
        { type: "button", onClick: onSubmit },
        "Send",
      ),
    ),
}));

vi.mock("@/components/agent/asset-drawer", () => ({
  AssetDrawer: () => null,
}));

vi.mock("@/components/agent/chat-message", () => ({
  ChatMessage: ({ message }: { message: { content: string } }) =>
    React.createElement("div", null, message.content),
}));

vi.mock("@/components/agent/empty-agent-state", () => ({
  EmptyAgentState: () => React.createElement("div", null, "Empty"),
}));

const project: ProjectWorkspace = {
  id: "project-1",
  ownerId: "user-1",
  inboxItemId: null,
  title: "Goa Reel",
  status: "posted",
  format: "reel",
  platform: "instagram",
  topicTags: [],
  experimentTags: [],
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
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    watchTimeNote: "",
    reflection: "",
    decision: "repeat",
    followUpIdea: "",
  },
  aiSuggestions: {
    hooks: [],
    captions: [],
    rewrites: [],
    shotList: [],
    followUps: [],
    performanceSummary: "",
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

describe("agent UI components", () => {
  beforeEach(() => {
    fetchJson.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("slash command menu discovers supported commands from slash input", () => {
    const onSelect = vi.fn();

    render(React.createElement(SlashCommandMenu, { input: "/sto", onSelect }));

    expect(screen.queryByText("slash")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /\/storyboard/i }));
    expect(onSelect).toHaveBeenCalledWith("/storyboard");
  });

  test("visible slash tray commands match the backend command surface", () => {
    expect(getVisibleCommands("/").map((item) => item.command)).toEqual([
      "/script",
      "/plan",
      "/readiness-check",
      "/form-json-prompt",
      "/package",
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

  test("model accordion renders nested collapsed modality sections", () => {
    render(
      React.createElement(ModelAccordion, {
        models: {
          chat: "gemini-2.5-flash",
          image: "Qwen/Qwen-Image",
          video: "tencent/HunyuanVideo",
          audio: "hexgrad/Kokoro-82M",
        },
        onChange: () => {},
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /routing/i }));
    expect(screen.queryByLabelText("chat model")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("image model")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /image/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /video/i }));
    expect(screen.getByLabelText("video model")).toBeInTheDocument();
    expect(screen.queryByLabelText("chat model")).not.toBeInTheDocument();
  });

  test("tool call cards are minimized by default and expand to show draft output", () => {
    render(
      React.createElement(ToolCallCard, {
        toolCall: {
          id: "tool-call-1",
          kind: "tool",
          toolName: "Script Builder",
          command: "script",
          status: "completed",
          requiresApproval: false,
          output: {
            kind: "script_package",
            hook: "Stop app hopping.",
            script: "SceneBook keeps the reel plan connected.",
          },
          createdAt: new Date().toISOString(),
        },
      }),
    );

    expect(screen.getByText("Script Builder")).toBeInTheDocument();
    expect(screen.getByText(/Stop app hopping/i)).toBeInTheDocument();
    expect(screen.queryByText(/SceneBook keeps the reel plan connected/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show details/i }));

    expect(screen.getByText(/SceneBook keeps the reel plan connected/i)).toBeInTheDocument();
  });

  test("failed tool call cards auto-expand to show error details", () => {
    render(
      React.createElement(ToolCallCard, {
        toolCall: {
          id: "tool-call-failed",
          kind: "tool",
          toolName: "Publisher",
          command: "publish",
          status: "failed",
          requiresApproval: false,
          output: {
            kind: "tool_error",
            message: "External publish action failed.",
          },
          errorMessage: "External publish action failed.",
          createdAt: new Date().toISOString(),
        },
      }),
    );

    expect(screen.getByRole("button", { name: /hide details/i })).toBeInTheDocument();
    expect(screen.getAllByText(/External publish action failed/i).length).toBeGreaterThan(0);
  });

  test("tool call cards auto-expand when a running card rerenders as failed", () => {
    const runningTool = {
      id: "tool-call-rerender",
      kind: "tool" as const,
      toolName: "Script Builder",
      command: "script",
      status: "running",
      requiresApproval: false,
      output: {
        kind: "tool_progress",
        activity: "Writing",
      },
      createdAt: new Date().toISOString(),
    };

    const { rerender } = render(
      React.createElement(ToolCallCard, {
        toolCall: runningTool,
      }),
    );

    expect(screen.getByRole("button", { name: /show details/i })).toBeInTheDocument();

    rerender(
      React.createElement(ToolCallCard, {
        toolCall: {
          ...runningTool,
          status: "failed",
          output: {
            kind: "tool_error",
            message: "Script generation failed.",
          },
          errorMessage: "Script generation failed.",
        },
      }),
    );

    expect(screen.getByRole("button", { name: /hide details/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Script generation failed/i).length).toBeGreaterThan(0);
  });

  test("history selector renders prior project threads plus muted new conversation", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return {
          threads: [
            { id: "thread-1", title: "Beach Sunset", updated_at: "2026-05-27T10:00:00.000Z" },
            { id: "thread-2", title: "Studio Product", updated_at: "2026-05-27T09:00:00.000Z" },
          ],
        };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return {
        threadId: "thread-1",
        messages: [{ id: "m1", role: "assistant", content: "hello" }],
        toolCalls: [],
      };
    });

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("hello");
    fireEvent.click(screen.getByRole("button", { name: "Beach Sunset" }));

    const newConversationOptions = await screen.findAllByText("+ New Conversation");
    expect(newConversationOptions.at(-1)?.closest("button")).toHaveClass("text-muted");
    expect(screen.getByText("Studio Product")).toBeInTheDocument();
  });

  test("agent center header avoids duplicated Hub and Editor navigation", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    render(React.createElement(AgentChatIsland, { project }));

    expect(await screen.findByText("Empty")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /project hub/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Goa Reel \/ Strategic Agent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/New conversation/i).length).toBeGreaterThan(0);
  });

  test("ProjectMind readiness CTA prefills the composer from the Agent cockpit", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    fireEvent.click(screen.getByRole("button", { name: /run readiness check/i }));

    expect((screen.getByLabelText("composer") as HTMLInputElement).value).toMatch(
      /^\/readiness-check Analyze this project's readiness/,
    );
  });

  test("new conversation stays empty when no persisted thread exists", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    render(React.createElement(AgentChatIsland, { project }));

    expect(await screen.findByText("Empty")).toBeInTheDocument();
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  test("composer remains mounted in the bottom chat surface", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    render(React.createElement(AgentChatIsland, { project }));

    expect(await screen.findByText("Empty")).toBeInTheDocument();
    const composer = screen.getByTestId("chat-composer");
    expect(composer.parentElement?.parentElement).toHaveClass("absolute", "bottom-0");
  });

  test("tool-card quick commands populate the composer draft", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return {
        threadId: "thread-1",
        messages: [],
        toolCalls: [
          {
            id: "tool-1",
            tool_name: "Prompt Builder",
            command: "form-json-prompt",
            status: "completed",
            requires_approval: false,
            output: {
              kind: "prompt_json",
              modality: "image",
              prompt: "A precise product demo still",
            },
            created_at: "2026-05-27T10:00:00.000Z",
          },
        ],
      };
    });

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Prompt Builder");
    fireEvent.click(screen.getByRole("button", { name: /show details/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate image/i }));

    expect((screen.getByLabelText("composer") as HTMLInputElement).value).toMatch(/^\/generate-image /);
  });

  test("agent history renders persisted workflow-aware timeline entries", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return {
        threadId: "thread-1",
        messages: [],
        toolCalls: [],
        entries: [
          {
            id: "patch-entry-1",
            kind: "patch",
            patchId: "patch-1",
            title: "Full package patch",
            summary: "Save the generated production package.",
            status: "planned",
            canApply: true,
            operations: [
              {
                operationIndex: 0,
                type: "create_project_artifact",
                status: "planned",
                reason: "Store the full production package.",
              },
            ],
            createdAt: "2026-06-02T10:00:00.000Z",
          },
        ],
      };
    });

    render(React.createElement(AgentChatIsland, { project }));

    expect(await screen.findByText("Full package patch")).toBeInTheDocument();
    expect(screen.getByText("Create project artifact")).toBeInTheDocument();
    expect(screen.getByText("Store the full production package.")).toBeInTheDocument();
  });

  test("activity strip transitions through command, awaiting input, and done states", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    let resolveFetch: ((value: Response) => void) | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "/generate-image children playing at a beach sunset in Goa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/generating image/i)).toBeInTheDocument();

    if (!resolveFetch) {
      throw new Error("Expected fetch promise resolver to be set.");
    }

    const resolveFetchFn: (value: Response) => void = resolveFetch;

    resolveFetchFn(
      new Response(
        JSON.stringify({
          threadId: "thread-1",
          message: "done",
          tool: {
            id: "tool-1",
            command: "generate-image",
            status: "completed",
            toolName: "Generate Image",
            requiresApproval: false,
            result: {
              output: {
                kind: "media_asset",
                modality: "image",
                assetId: "asset-1",
                url: "https://example.com/image.png",
              },
            },
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      const badge = screen.getAllByText(/done/i).find((element) => element.tagName === "SPAN");
      expect(badge).toBeDefined();
    });
  });

  test("streaming tool events append a tool card without reloading history", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            `data: ${JSON.stringify({ type: "meta", threadId: "thread-1", runId: "run-1" })}`,
            `data: ${JSON.stringify({ type: "chunk", text: "Script package ready." })}`,
            `data: ${JSON.stringify({
              type: "tool",
              tool: {
                id: "tool-1",
                command: "script",
                status: "completed",
                toolName: "Script Builder",
                requiresApproval: false,
                result: {
                  output: {
                    kind: "script_package",
                    hook: "Hook",
                  },
                },
              },
            })}`,
            "",
          ].join("\n\n"),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "/script launch script" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Script package ready.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Script Builder/i)).toBeInTheDocument();
    });
    expect(fetchJson).toHaveBeenCalledTimes(4);
  });

  test("streaming v4 workflow events render workflow and artifact cards", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      if (url.includes("threadId=thread-1")) {
        return {
          threadId: "thread-1",
          messages: [{ id: "assistant-final", role: "assistant", content: "Done once." }],
          toolCalls: [],
        };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            `data: ${JSON.stringify({ type: "meta", threadId: "thread-1", runId: "run-1" })}`,
            `data: ${JSON.stringify({
              type: "v4_event",
              event: {
                type: "workflow_completed",
                threadId: "thread-1",
                runId: "run-1",
                workflowName: "create_full_production_package",
                message: "Complete package ready.",
                observation: {
                  output: {
                    workflowName: "create_full_production_package",
                    artifacts: [
                      {
                        type: "full_production_package",
                        title: "Full production package",
                        summary: "Complete package ready.",
                        payload: {
                          plan: { hook: "Open with the beach reveal." },
                          scriptPackage: { script: "Show the route, then the sunset payoff." },
                          shootPack: { scenes: ["Beach walk", "Sunset close"] },
                          assetPromptPack: { imagePrompts: ["Goa beach sunset reel still"] },
                          publishPrep: { caption: "A slow evening in Goa." },
                        },
                      },
                    ],
                    patchId: "patch-1",
                    patchTitle: "Save full production package",
                    patchSummary: "Save all generated sections.",
                    patchAutoApplyReason: "Patch has 9 operations; auto-apply limit is 8.",
                  },
                },
              },
            })}`,
            "",
          ].join("\n\n"),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "Make me the full production package" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Create full production package")).toBeInTheDocument();
    expect(screen.getAllByText("Complete package ready.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Full production package").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Script").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shoot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Publish").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Full production package")).toHaveLength(1);
    expect(screen.getAllByText("Save full production package").length).toBeGreaterThan(0);
  });

  test("runtime v4 legacy mirrors do not duplicate final responses or history refreshes", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            `data: ${JSON.stringify({ type: "meta", threadId: "thread-1", runId: "run-1" })}`,
            `data: ${JSON.stringify({
              type: "v4_event",
              event: {
                type: "final_response",
                threadId: "thread-1",
                runId: "run-1",
                response: "Done once.",
              },
            })}`,
            `data: ${JSON.stringify({ type: "message_delta", text: "Done once." })}`,
            `data: ${JSON.stringify({
              type: "v4_event",
              event: {
                type: "run_completed",
                threadId: "thread-1",
                runId: "run-1",
              },
            })}`,
            `data: ${JSON.stringify({ type: "run_completed", threadId: "thread-1", runId: "run-1" })}`,
            "",
          ].join("\n\n"),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "Finish the run" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      const historyRefreshes = fetchJson.mock.calls.filter(([url]) =>
        typeof url === "string" && url.includes("threadId=thread-1")
      );
      expect(historyRefreshes).toHaveLength(0);
    });
    expect(screen.queryByText("Done once.Done once.")).not.toBeInTheDocument();
  });

  test("archives a conversation from the recent conversations rail", async () => {
    fetchJson.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("listThreads=true")) {
        return {
          threads: [
            { id: "11111111-1111-4111-8111-111111111111", title: "Hook ideas", updated_at: "2026-06-02T00:00:00.000Z" },
          ],
        };
      }

      if (init?.method === "PATCH") {
        expect(init.body).toContain('"action":"archiveThread"');
        expect(init.body).toContain("11111111-1111-4111-8111-111111111111");
        return { success: true };
      }

      return { threadId: null, messages: [], toolCalls: [], entries: [] };
    });

    render(React.createElement(AgentChatIsland, { project }));

    const archive = await screen.findByRole("button", { name: /archive hook ideas/i });
    fireEvent.click(archive);

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        `/api/projects/${project.id}/agent`,
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  test("streams assistant chunks into the active message without reloading history on completion", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();

    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [], entries: [] };
    });

    global.fetch = vi.fn(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(nextController) {
          controller = nextController;
        },
      });

      queueMicrotask(() => {
        controller.enqueue(encoder.encode(`data: {"type":"meta","threadId":"11111111-1111-4111-8111-111111111111"}\n\n`));
        controller.enqueue(encoder.encode(`data: {"type":"chunk","text":"## Hook\\n"}\n\n`));
        controller.enqueue(encoder.encode(`data: {"type":"chunk","text":"This streams."}\n\n`));
        controller.enqueue(encoder.encode(`data: {"type":"run_completed","threadId":"11111111-1111-4111-8111-111111111111"}\n\n`));
        controller.close();
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
        status: 200,
      });
    }) as typeof fetch;

    render(React.createElement(AgentChatIsland, { project }));

    fireEvent.change(screen.getByLabelText("composer"), { target: { value: "write hook" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText((content) => content.includes("## Hook") && content.includes("This streams.")),
    ).toBeInTheDocument();
    expect(fetchJson).not.toHaveBeenCalledWith(expect.stringContaining("threadId=11111111-1111-4111-8111-111111111111"));
  });

  test("mixed runtime v4 streams keep legacy-only finalization", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      if (url.includes("threadId=thread-1")) {
        return {
          threadId: "thread-1",
          messages: [{ id: "assistant-final", role: "assistant", content: "Legacy final." }],
          toolCalls: [],
        };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            `data: ${JSON.stringify({ type: "meta", threadId: "thread-1", runId: "run-1" })}`,
            `data: ${JSON.stringify({
              type: "v4_event",
              event: {
                type: "workflow_completed",
                threadId: "thread-1",
                runId: "run-1",
                workflowName: "create_script_package",
                message: "Script package ready.",
                observation: {
                  output: {
                    artifacts: [
                      {
                        id: "artifact-script",
                        type: "script_package",
                        title: "Script package",
                        payload: { script: "Open with the practical result." },
                      },
                    ],
                  },
                },
              },
            })}`,
            `data: ${JSON.stringify({ type: "message_delta", text: "Legacy final." })}`,
            `data: ${JSON.stringify({ type: "run_completed", threadId: "thread-1", runId: "run-1" })}`,
            "",
          ].join("\n\n"),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "Make a script package" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      const historyRefreshes = fetchJson.mock.calls.filter(([url]) =>
        typeof url === "string" && url.includes("threadId=thread-1")
      );
      expect(historyRefreshes).toHaveLength(0);
    });
    expect(await screen.findByText("Legacy final.")).toBeInTheDocument();
  });

  test("legacy workflow-shaped stream packets render rich workflow cards", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            `data: ${JSON.stringify({ type: "meta", threadId: "thread-1", runId: "run-1" })}`,
            `data: ${JSON.stringify({
              type: "tool_completed",
              threadId: "thread-1",
              runId: "run-1",
              toolName: "create_full_production_package",
              workflowName: "create_full_production_package",
              message: "Legacy package ready.",
              observation: {
                output: {
                  artifacts: [
                    {
                      type: "full_production_package",
                      title: "Legacy full package",
                      payload: {
                        plan: { hook: "Start with the creator problem." },
                        scriptPackage: { script: "Show the before and after." },
                        shootPack: { scenes: ["Desk setup", "Timeline close"] },
                        assetPromptPack: { imagePrompts: ["Creator desk product still"] },
                        publishPrep: { caption: "Build once, ship everywhere." },
                      },
                    },
                  ],
                  patchId: "patch-legacy",
                  patchTitle: "Save legacy package",
                  patchSummary: "Save generated package.",
                },
              },
            })}`,
            "",
          ].join("\n\n"),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "Make the package" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Create full production package")).toBeInTheDocument();
    expect(screen.getByText("Legacy package ready.")).toBeInTheDocument();
    expect(screen.getAllByText("Legacy full package").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Save legacy package").length).toBeGreaterThan(0);
  });

  test("streamed patch operation updates do not regress earlier operation statuses", async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes("listThreads=true")) {
        return { threads: [] };
      }
      if (url.includes("/assets")) {
        return { folders: [], looseAssets: [] };
      }
      return { threadId: null, messages: [], toolCalls: [] };
    });

    const patch = {
      id: "patch-status",
      title: "Patch status regression",
      summary: "Apply a two-step project update.",
      operations: [
        { type: "update_creative_brief", reason: "Save the creative brief." },
        { type: "create_script_version", reason: "Save the script version." },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            `data: ${JSON.stringify({ type: "meta", threadId: "thread-1", runId: "run-1" })}`,
            `data: ${JSON.stringify({
              type: "v4_event",
              event: {
                type: "patch_operation_completed",
                threadId: "thread-1",
                runId: "run-1",
                patch,
                operationIndex: 0,
                message: "Creative brief saved.",
              },
            })}`,
            `data: ${JSON.stringify({
              type: "v4_event",
              event: {
                type: "patch_operation_running",
                threadId: "thread-1",
                runId: "run-1",
                patch,
                operationIndex: 1,
                message: "Script version saving.",
              },
            })}`,
            "",
          ].join("\n\n"),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );

    render(React.createElement(AgentChatIsland, { project }));

    await screen.findByText("Empty");
    fireEvent.change(screen.getByLabelText("composer"), {
      target: { value: "Apply the patch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Patch status regression")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Running")).toBeInTheDocument();
    });
  });
});
