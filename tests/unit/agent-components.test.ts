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
  AgentComposer: ({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) =>
    React.createElement(
      "div",
      null,
      React.createElement("input", {
        "aria-label": "composer",
        value,
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      }),
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
          status: "awaiting_approval",
          requiresApproval: true,
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
    expect(screen.getByText(/draft ready/i)).toBeInTheDocument();
    expect(screen.queryByText(/SceneBook keeps the reel plan connected/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show details/i }));

    expect(screen.getByText(/SceneBook keeps the reel plan connected/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /Beach Sunset/i }));

    const newConversationOptions = await screen.findAllByText("+ New Conversation");
    expect(newConversationOptions.at(-1)?.closest("button")).toHaveClass("text-muted");
    expect(screen.getByText("Studio Product")).toBeInTheDocument();
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
});
