import React from "react";
import fs from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { activityForRuntimeV4Event } from "@/components/agent/runtime-v4-event-adapter";
import { AssetDrawer } from "@/components/agent/asset-drawer";
import { PatchPreviewCard } from "@/components/agent/patch-preview-card";
import { ProjectMindPanel } from "@/components/agent/project-mind-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
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

  test("semantic runtime buttons use blue cockpit tokens without gradients", () => {
    render(<Button variant="runtime">Run agent</Button>);

    const button = screen.getByRole("button", { name: "Run agent" });
    expect(button).toHaveClass("border-[var(--blue)]");
    expect(button).toHaveClass("bg-[color-mix(in_srgb,var(--blue)_16%,transparent)]");
    expect(button).toHaveClass("text-[var(--blue-2)]");
    expect(button.className).not.toContain("gradient");
  });

  test("light-surface button variants keep review actions legible", () => {
    render(
      <div>
        <Button variant="coral">Apply to workspace</Button>
        <Button variant="ghostLight">Inspect JSON</Button>
      </div>,
    );

    const apply = screen.getByRole("button", { name: "Apply to workspace" });
    expect(apply).toHaveClass("bg-[var(--coral)]");
    expect(apply).toHaveClass("text-[var(--black)]");

    const inspect = screen.getByRole("button", { name: "Inspect JSON" });
    expect(inspect).toHaveClass("text-[var(--light-ink)]");
    expect(inspect).toHaveClass("hover:border-[color-mix(in_srgb,var(--black)_12%,transparent)]");
  });

  test("status badges expose semantic pill variants for creative and applied states", () => {
    render(
      <div>
        <Badge variant="creative">Creative</Badge>
        <Badge variant="applied">Applied</Badge>
      </div>,
    );

    const creative = screen.getByText("Creative");
    expect(creative).toHaveClass("rounded-[var(--radius-pill)]");
    expect(creative).toHaveClass("font-mono");
    expect(creative).toHaveClass("uppercase");
    expect(creative).toHaveClass("border-[var(--coral)]");
    expect(creative).toHaveClass("bg-[color-mix(in_srgb,var(--coral)_14%,transparent)]");
    expect(creative).toHaveClass("text-[var(--coral-2)]");

    const applied = screen.getByText("Applied");
    expect(applied).toHaveClass("border-[var(--lime)]");
    expect(applied).toHaveClass("bg-[color-mix(in_srgb,var(--lime)_12%,transparent)]");
    expect(applied).toHaveClass("text-[var(--lime)]");
  });

  test("inputs use dark translucent fields with token placeholder and blue focus-visible ring", () => {
    render(<Input placeholder="Describe the scene" disabled />);

    const input = screen.getByPlaceholderText("Describe the scene");
    expect(input).toHaveClass("bg-[color-mix(in_srgb,var(--panel-2)_72%,transparent)]");
    expect(input).toHaveClass("border-[var(--line)]");
    expect(input).toHaveClass("text-[var(--ink)]");
    expect(input).toHaveClass("placeholder:text-[var(--muted-2)]");
    expect(input).toHaveClass("focus-visible:ring-2");
    expect(input).toHaveClass("focus-visible:ring-[var(--blue)]/30");
    expect(input).toHaveClass("disabled:cursor-not-allowed");
  });

  test("textareas share the SceneBook dark field and accessible focus contract", () => {
    render(<Textarea placeholder="Shot notes" disabled />);

    const textarea = screen.getByPlaceholderText("Shot notes");
    expect(textarea).toHaveClass("bg-[color-mix(in_srgb,var(--panel-2)_72%,transparent)]");
    expect(textarea).toHaveClass("placeholder:text-[var(--muted-2)]");
    expect(textarea).toHaveClass("focus-visible:border-[var(--blue)]");
    expect(textarea).toHaveClass("focus-visible:ring-[var(--blue)]/30");
    expect(textarea).toHaveClass("disabled:bg-[color-mix(in_srgb,var(--panel-3)_48%,transparent)]");
  });

  test("review cards use light clarity surfaces with token radius and review shadow", () => {
    render(
      <Card variant="review">
        <CardTitle>Review package</CardTitle>
        <CardDescription>Inspect the planned patch before applying it.</CardDescription>
      </Card>,
    );

    const card = screen.getByText("Review package").closest("div");
    expect(card).toHaveClass("rounded-[var(--radius-lg)]");
    expect(card).toHaveClass("border-[var(--line)]");
    expect(card).toHaveClass("bg-[var(--bone)]");
    expect(card).toHaveClass("text-[var(--light-ink)]");
    expect(card).toHaveClass("shadow-[var(--shadow-soft)]");

    expect(screen.getByText("Review package")).toHaveClass("text-current");
    expect(screen.getByText("Inspect the planned patch before applying it.")).toHaveClass("text-current");
  });

  test("floating and review surfaces allow callers to remove elevation", () => {
    render(
      <div>
        <Card variant="review" className="shadow-none">
          Review override
        </Card>
        <Panel variant="floating" className="shadow-none">
          Floating override
        </Panel>
      </div>,
    );

    const card = screen.getByText("Review override");
    expect(card).toHaveClass("shadow-none");
    expect(card).not.toHaveClass("shadow-[var(--shadow-soft)]");

    const panel = screen.getByText("Floating override");
    expect(panel).toHaveClass("shadow-none");
    expect(panel).not.toHaveClass("shadow-[var(--shadow-soft)]");
  });

  test("panels expose default and danger SceneBook cockpit surfaces", () => {
    render(
      <div>
        <Panel>Default panel</Panel>
        <Panel variant="danger">Danger panel</Panel>
      </div>,
    );

    const defaultPanel = screen.getByText("Default panel");
    expect(defaultPanel).toHaveClass("rounded-[var(--radius-lg)]");
    expect(defaultPanel).toHaveClass("bg-[color-mix(in_srgb,var(--panel)_86%,transparent)]");
    expect(defaultPanel).not.toHaveClass("shadow-[var(--shadow-soft)]");

    const dangerPanel = screen.getByText("Danger panel");
    expect(dangerPanel).toHaveClass("border-[var(--danger)]");
    expect(dangerPanel).toHaveClass("bg-[color-mix(in_srgb,var(--danger)_10%,var(--panel))]");
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

  test("global ambient background stays as a subtle top-edge glow", () => {
    const source = fs.readFileSync("app/globals.css", "utf8");

    expect(source).toContain("radial-gradient(circle at 18% -14%, rgba(255,104,71,.10), transparent 18rem)");
    expect(source).toContain("radial-gradient(circle at 82% -16%, rgba(105,167,255,.08), transparent 20rem)");
    expect(source).toContain("linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 16%, var(--bg) 34%)");
  });
});
