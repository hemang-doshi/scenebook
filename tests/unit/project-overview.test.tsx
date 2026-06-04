import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProjectHubPage from "@/app/(workspace)/projects/[id]/page";
import type { ProjectWorkspace } from "@/lib/data/repository";

const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-1" }),
}));

const project: ProjectWorkspace = {
  id: "project-1",
  ownerId: "user-1",
  inboxItemId: null,
  title: "Goa creator workflow",
  status: "idea",
  format: "reel",
  platform: "instagram",
  topicTags: [],
  experimentTags: [],
  scriptLab: {
    angle: "Turn a beach route into a repeatable creator workflow.",
    hook: "Open with the route reveal.",
    outline: "Reveal, explain, show payoff.",
    script: "Start with the beach path, then show the exact filming sequence.",
    caption: "Save this route before your next Goa shoot.",
    onScreenText: "Route reveal",
    cta: "Save this workflow.",
    notes: "Need more B-roll.",
  },
  shootPack: {
    aRoll: [
      { id: "ar-1", label: "Record hook at the beach", done: false },
      { id: "ar-2", label: "Film closing CTA", done: true },
    ],
    bRoll: [{ id: "br-1", label: "Capture route marker", done: false }],
    screenCaptures: [],
    props: [],
    missingAssets: [],
    locationNotes: "Morning light.",
    visualNotes: "Keep cuts fast.",
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
  assets: [
    {
      id: "asset-local",
      cardId: "project-1",
      title: "Route reference",
      type: "image",
      url: "https://example.com/route.png",
      source: "generated",
    },
  ],
  readiness: {
    score: 67,
    label: "Nearly ready",
    missing: ["B-roll"],
  },
  generations: [],
  createdAt: "2026-06-02T09:00:00.000Z",
  updatedAt: "2026-06-03T10:30:00.000Z",
};

function setupFetchMock() {
  fetchJson.mockImplementation(async (url: string, options?: { method?: string; body?: string }) => {
    if (url === "/api/projects/project-1" && options?.method === "PATCH") {
      return {
        ...project,
        ...JSON.parse(options.body ?? "{}"),
      };
    }

    if (url === "/api/projects/project-1") {
      return project;
    }

    if (url === "/api/projects/project-1/assets") {
      return {
        folders: [],
        looseAssets: [
          {
            id: "asset-1",
            title: "Beach route frame",
            type: "image",
            url: "https://example.com/beach.png",
            source: "generated",
          },
        ],
      };
    }

    if (url === "/api/projects/project-1/agent") {
      return {
        threadId: "thread-1",
        messages: [
          {
            id: "msg-1",
            role: "assistant",
            content: "Drafted the first production package.",
            created_at: "2026-06-03T11:00:00.000Z",
          },
        ],
        toolCalls: [],
      };
    }

    throw new Error(`Unhandled fetchJson call: ${url}`);
  });
}

describe("ProjectHubPage", () => {
  beforeEach(() => {
    fetchJson.mockReset();
    setupFetchMock();
  });

  test("renders the project as a Project Hub with Agent as the primary path", async () => {
    render(<ProjectHubPage />);

    expect(await screen.findByRole("heading", { name: "Goa creator workflow" })).toBeInTheDocument();
    const hero = screen.getByRole("region", { name: /project hub hero/i });
    expect(within(hero).getByText("Project Hub")).toBeInTheDocument();
    expect(screen.getByText("Next recommended action")).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: /continue with agent/i })).toHaveAttribute(
      "href",
      "/projects/project-1/chat",
    );
    expect(within(hero).getByRole("link", { name: /open editor/i })).toHaveAttribute("href", "/editor/project-1");
    expect(within(hero).getByRole("link", { name: /view analytics/i })).toHaveAttribute("href", "/analytics");
  });

  test("uses semantic SceneBook badges for stage, format, and platform", async () => {
    render(<ProjectHubPage />);

    await screen.findByRole("heading", { name: "Goa creator workflow" });
    const hero = screen.getByRole("region", { name: /project hub hero/i });

    expect(within(hero).getAllByText("Idea")[0]).toHaveClass("border-[var(--coral)]");
    expect(within(hero).getAllByText("REEL")[0]).toHaveClass("border-[var(--blue)]");
    expect(within(hero).getAllByText("INSTAGRAM")[0]).toHaveClass("border-[var(--line)]");
  });

  test("keeps project property editing PATCH behavior", async () => {
    render(<ProjectHubPage />);

    await screen.findByRole("heading", { name: "Goa creator workflow" });
    fireEvent.click(screen.getByRole("button", { name: "Idea" }));
    fireEvent.click(screen.getByRole("button", { name: "Scripted" }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "scripted" }),
        }),
      );
    });
  });

  test("keeps ScriptLab autosave PATCH behavior", async () => {
    render(<ProjectHubPage />);

    const hook = await screen.findByLabelText("Hook");
    fireEvent.change(hook, { target: { value: "Start with the surprise route." } });
    fireEvent.blur(hook);

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ scriptLab: { hook: "Start with the surprise route." } }),
        }),
      );
    });
  });

  test("keeps shoot checklist toggle, add, and delete behavior exposed", async () => {
    render(<ProjectHubPage />);

    const task = await screen.findByLabelText("Record hook at the beach");
    fireEvent.click(task);

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"shootPack"'),
        }),
      );
    });

    const checklist = screen.getByRole("region", { name: /shoot checklist readiness/i });
    const newTask = within(checklist).getByPlaceholderText(/add inline task/i);
    fireEvent.change(newTask, { target: { value: "Film cutaway of map" } });
    fireEvent.keyDown(newTask, { key: "Enter" });

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Film cutaway of map"),
        }),
      );
    });

    fireEvent.click(within(checklist).getByRole("button", { name: /delete record hook at the beach/i }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Film closing CTA"),
        }),
      );
    });
  });
});
