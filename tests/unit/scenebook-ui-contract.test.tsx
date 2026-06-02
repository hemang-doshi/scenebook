import React from "react";
import fs from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { activityForRuntimeV4Event } from "@/components/agent/runtime-v4-event-adapter";
import { AssetDrawer } from "@/components/agent/asset-drawer";
import { PatchPreviewCard } from "@/components/agent/patch-preview-card";
import { ProjectMindPanel } from "@/components/agent/project-mind-panel";
import { Button } from "@/components/ui/button";
import type { PatchTimelineEntry } from "@/components/agent/types";
import type { ProjectWorkspace } from "@/lib/data/repository";

const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

const patchEntry: PatchTimelineEntry = {
  id: "patch-entry-1",
  kind: "patch",
  patchId: "patch-1",
  title: "Save full production package",
  summary: "Persist script, shoot, assets, and publish prep.",
  status: "planned",
  riskLevel: "medium",
  requiresApproval: false,
  canApply: true,
  operations: [
    {
      operationIndex: 0,
      type: "create_project_artifact",
      status: "planned",
      reason: "Store the package.",
    },
  ],
  createdAt: "2026-06-02T09:00:00.000Z",
};

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

describe("SceneBook UI contract", () => {
  beforeEach(() => {
    fetchJson.mockReset();
    vi.restoreAllMocks();
  });

  test("primary buttons use the SceneBook pill geometry and light-on-dark action style", () => {
    render(<Button variant="primary">Create package</Button>);

    const button = screen.getByRole("button", { name: "Create package" });
    expect(button).toHaveClass("rounded-[var(--radius-pill)]");
    expect(button).toHaveClass("bg-[var(--white)]");
    expect(button).toHaveClass("text-[var(--black)]");
  });

  test("runtime activity distinguishes missing input from approval required", () => {
    expect(activityForRuntimeV4Event({ type: "workflow_needs_input" })).toEqual({
      label: "needs input",
      tone: "warning",
    });
    expect(activityForRuntimeV4Event({ type: "patch_approval_required" })).toEqual({
      label: "approval required",
      tone: "warning",
    });
  });

  test("planned patch review exposes trust-layer actions and JSON inspection", () => {
    render(<PatchPreviewCard entry={patchEntry} projectId="project-1" />);

    expect(screen.getByRole("button", { name: /apply to workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit first/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /branch version/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /inspect json/i }));
    expect(screen.getByText(/"patchId": "patch-1"/)).toBeInTheDocument();
  });

  test("ProjectMind renders as a floating collapsible island with editable facts", async () => {
    fetchJson.mockResolvedValueOnce({ ...project, scriptLab: { ...project.scriptLab, hook: "Updated hook" } });

    render(<ProjectMindPanel project={project} />);

    const island = screen.getByRole("complementary", { name: /projectmind/i });
    expect(island).toHaveAttribute("data-floating", "true");
    expect(island).toHaveAttribute("data-state", "collapsed");

    fireEvent.click(screen.getByRole("button", { name: /expand projectmind/i }));
    expect(island).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: /edit projectmind/i }));
    const hook = screen.getByLabelText("ProjectMind hook");
    fireEvent.change(hook, { target: { value: "Updated hook" } });
    fireEvent.click(screen.getByRole("button", { name: /save projectmind/i }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/projects/project-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Updated hook"),
        }),
      );
    });
  });

  test("project hub uses shared SceneBook gradients instead of one-off mismatched gradients", () => {
    const source = fs.readFileSync("app/(workspace)/projects/[id]/page.tsx", "utf8");

    expect(source).not.toContain("linear-gradient(135deg, rgba(255,104,71,.74), rgba(105,167,255,.54))");
    expect(source).toContain("sb-gradient-thumbnail");
  });

  test("asset drawer shows provenance and an editor import action", async () => {
    fetchJson.mockResolvedValueOnce({
      folders: [
        {
          id: "folder-1",
          name: "Scene 01",
          assets: [
            {
              id: "asset-1",
              title: "Beach reveal",
              type: "image",
              url: "https://example.com/beach.png",
              source: "gemini image",
            },
          ],
        },
      ],
      looseAssets: [],
    });

    render(<AssetDrawer projectId="project-1" open onOpenChange={() => {}} />);

    expect(await screen.findByText("Beach reveal")).toBeInTheDocument();
    expect(screen.getByText(/gemini image/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /import beach reveal to editor/i })).toHaveAttribute(
      "href",
      "/editor/project-1?asset=asset-1",
    );
  });

  test("workspace pages avoid retired shell color mismatches", () => {
    const filePaths = [
      "app/(workspace)/analytics/page.tsx",
      "app/(workspace)/settings/page.tsx",
      "app/(workspace)/board/page.tsx",
      "app/(workspace)/inbox/page.tsx",
      "app/(workspace)/playground/page.tsx",
    ];

    for (const filePath of filePaths) {
      const source = fs.readFileSync(filePath, "utf8");
      expect(source).not.toContain("bg-[var(--block-lime)]");
      expect(source).not.toContain("bg-[var(--block-cream)]");
      expect(source).not.toContain("rgb(0, 0, 0)");
      expect(source).not.toMatch(/\b(?:text|bg|border)-accent\b/);
      expect(source).not.toMatch(/\b(?:text|bg|border)-pink-/);
    }
  });
});
