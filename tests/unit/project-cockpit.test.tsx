import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ProjectCockpit } from "@/components/agent/project-cockpit";
import type { ProjectWorkspace } from "@/lib/data/repository";

const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

const project: ProjectWorkspace = {
  id: "project-1",
  ownerId: "user-1",
  inboxItemId: null,
  title: "Goa Reel",
  status: "idea",
  format: "reel",
  platform: "instagram",
  topicTags: [],
  experimentTags: [],
  scriptLab: {
    angle: "Beach workflow",
    hook: "Open with the reveal.",
    outline: "",
    script: "",
    caption: "",
    onScreenText: "",
    cta: "Save this route.",
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
  createdAt: "2026-06-02T09:00:00.000Z",
  updatedAt: "2026-06-02T09:00:00.000Z",
};

describe("ProjectCockpit", () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  test("runs a user-triggered AI readiness check and renders the report", async () => {
    fetchJson.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/readiness") && init?.method === "POST") {
        return {
          analysis: {
            score: 78,
            label: "Shoot-ready",
            confidence: 0.84,
            summary: "Script is strong enough, but the shoot plan needs B-roll before editing.",
            stage: "shoot",
            blockers: [
              {
                area: "shoot",
                severity: "high",
                reason: "B-roll plan is missing.",
                suggestedAction: "Add three B-roll beats.",
              },
            ],
            nextActions: [
              {
                title: "Add B-roll",
                command: "/tasks add b-roll beats",
                reason: "This closes the shoot gap.",
              },
            ],
            evidence: {
              scriptSignals: ["Hook exists."],
              shootSignals: ["No B-roll."],
              assetSignals: ["One asset."],
              publishSignals: ["Caption missing."],
            },
            fallbackUsed: false,
          },
        };
      }
      return { folders: [], looseAssets: [] };
    });

    render(<ProjectCockpit project={project} assetCount={1} />);

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    fireEvent.click(screen.getByRole("button", { name: /run readiness check/i }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1/readiness",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Shoot-ready")).toBeInTheDocument();
    expect(screen.getByText(/shoot plan needs b-roll/i)).toBeInTheDocument();
    expect(screen.getByText(/B-roll plan is missing/i)).toBeInTheDocument();
  });

  test("keeps assets inside the expanded cockpit and preserves editor import links", async () => {
    fetchJson.mockResolvedValue({
      folders: [],
      looseAssets: [
        {
          id: "asset-1",
          title: "Hero still",
          type: "image",
          url: "https://example.com/hero.png",
          source: "gemini image",
        },
      ],
    });

    render(<ProjectCockpit project={project} assetCount={1} />);

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    fireEvent.click(screen.getByRole("button", { name: /^assets$/i }));

    expect(await screen.findByText("Hero still")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /import hero still to editor/i })).toHaveAttribute(
      "href",
      "/editor/project-1?asset=asset-1",
    );
    expect(screen.getByRole("complementary", { name: /projectmind/i })).toHaveAttribute("data-state", "expanded");
  });

  test("action commands populate the agent composer through the quick command callback", () => {
    const onQuickCommand = vi.fn();
    render(<ProjectCockpit project={project} onQuickCommand={onQuickCommand} />);

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    fireEvent.click(screen.getByRole("button", { name: /^actions$/i }));
    fireEvent.click(screen.getByRole("button", { name: /\/script/i }));

    expect(onQuickCommand).toHaveBeenCalledWith(expect.stringMatching(/^\/script /));
  });
});
