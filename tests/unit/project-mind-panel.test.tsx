import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { ProjectMindPanel, READINESS_CHECK_PROMPT } from "@/components/agent/project-mind-panel";
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

describe("ProjectMindPanel", () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  test("uses the collapsed ProjectMind trigger to expand and collapse the cockpit drawer", () => {
    render(<ProjectMindPanel project={project} />);

    const island = screen.getByRole("complementary", { name: /projectmind/i });
    expect(island).toHaveAttribute("data-state", "collapsed");

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    expect(island).toHaveAttribute("data-state", "expanded");
    expect(screen.getByText("Project Readiness")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse projectmind/i }));
    expect(island).toHaveAttribute("data-state", "collapsed");
  });

  test("does not show fake calculated readiness meters without an AI assessment", () => {
    render(<ProjectMindPanel project={project} />);

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));

    expect(screen.getByText("No AI readiness check yet.")).toBeInTheDocument();
    expect(screen.getByText(/brief, script, shoot checklist/i)).toBeInTheDocument();
    expect(screen.queryByText(/Script:\s*\d+%/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shoot:\s*\d+%/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assets:\s*\d+%/i)).not.toBeInTheDocument();
  });

  test("readiness CTA prefills the AI readiness command", () => {
    const onQuickCommand = vi.fn();
    render(<ProjectMindPanel project={project} onQuickCommand={onQuickCommand} />);

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    fireEvent.click(screen.getByRole("button", { name: /run readiness check/i }));

    expect(onQuickCommand).toHaveBeenCalledWith(READINESS_CHECK_PROMPT);
  });
});
