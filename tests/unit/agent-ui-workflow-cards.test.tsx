import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ArtifactPreviewCard } from "@/components/agent/artifact-preview-card";
import { WorkflowCard } from "@/components/agent/workflow-card";
import type { ArtifactTimelineEntry, WorkflowTimelineEntry } from "@/components/agent/types";

describe("workflow-aware agent UI cards", () => {
  test("workflow card renders workflow summary and generated artifacts", () => {
    const entry: WorkflowTimelineEntry = {
      id: "workflow-1",
      kind: "workflow",
      workflowName: "create_full_production_package",
      status: "completed",
      summary: "Complete balcony composting production package is ready.",
      artifacts: [
        {
          id: "artifact-1",
          kind: "artifact",
          artifactType: "script_package",
          title: "Script package",
          summary: "Hook, script, caption, and pacing notes.",
          payload: {},
          createdAt: "2026-06-02T09:00:00.000Z",
        },
        {
          id: "artifact-2",
          kind: "artifact",
          artifactType: "shoot_pack",
          title: "Shoot pack",
          summary: "A-roll, b-roll, props, and missing assets.",
          payload: {},
          createdAt: "2026-06-02T09:00:01.000Z",
        },
      ],
      patch: {
        patchId: "patch-1",
        planned: true,
        applied: false,
        title: "Save full production package",
        status: "planned",
      },
      nextAction: "Shoot the kitchen setup.",
      createdAt: "2026-06-02T09:00:00.000Z",
    };

    render(<WorkflowCard entry={entry} />);

    expect(screen.getByText("Create full production package")).toBeInTheDocument();
    expect(screen.getByText("Complete balcony composting production package is ready.")).toBeInTheDocument();
    expect(screen.getByText("Script package")).toBeInTheDocument();
    expect(screen.getByText("Shoot pack")).toBeInTheDocument();
    expect(screen.getByText("Save full production package")).toBeInTheDocument();
    expect(screen.getByText("Shoot the kitchen setup.")).toBeInTheDocument();
  });

  test("full production package renders plan/script/shoot/assets/publish sections", () => {
    const entry: ArtifactTimelineEntry = {
      id: "artifact-full-package",
      kind: "artifact",
      artifactType: "full_production_package",
      title: "Full production package",
      summary: "Everything needed to shoot and publish the reel.",
      payload: {
        plan: {
          angle: "Balcony composting without smell or overwhelm.",
          nextBestAction: "Shoot the kitchen setup.",
        },
        scriptPackage: {
          selectedHook: "Your balcony can handle composting.",
          script: "Start small: jar, browns, scraps, and a weekly reset.",
        },
        shootPack: {
          scenes: ["Countertop setup", "Balcony placement"],
          props: ["Jar", "paper", "scraps"],
        },
        assetPromptPack: {
          imagePrompts: ["Small balcony compost setup in natural light."],
          thumbnailPrompt: "Tiny balcony compost setup, readable label.",
        },
        publishPrep: {
          caption: "Small-space composting can start with one jar and one habit.",
          hashtags: ["#balconygarden", "#composting"],
        },
      },
      createdAt: "2026-06-02T09:00:00.000Z",
    };

    render(<ArtifactPreviewCard entry={entry} />);

    expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Script" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shoot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Assets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByText("Your balcony can handle composting.")).toBeInTheDocument();
    expect(screen.getByText("Small-space composting can start with one jar and one habit.")).toBeInTheDocument();
  });

  test("artifact preview copy buttons copy caption hashtags and prompts", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const entry: ArtifactTimelineEntry = {
      id: "artifact-copy-actions",
      kind: "artifact",
      artifactType: "full_production_package",
      title: "Full production package",
      payload: {
        scriptPackage: {
          script: "Open with the jar, then show the balcony reset.",
        },
        assetPromptPack: {
          imagePrompts: ["Sunlit balcony compost jar with paper browns."],
          thumbnailPrompt: "Balcony compost starter kit on a bright table.",
        },
        publishPrep: {
          caption: "Start composting with one jar and one weekly reset.",
          hashtags: ["#composting", "#balconygarden"],
        },
      },
      createdAt: "2026-06-02T09:00:00.000Z",
    };

    render(<ArtifactPreviewCard entry={entry} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy script" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Open with the jar, then show the balcony reset."));

    fireEvent.click(screen.getByRole("button", { name: "Copy caption" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Start composting with one jar and one weekly reset."));

    fireEvent.click(screen.getByRole("button", { name: "Copy hashtags" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("#composting\n#balconygarden"));

    fireEvent.click(screen.getByRole("button", { name: "Copy image prompts" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Sunlit balcony compost jar with paper browns."));

    fireEvent.click(screen.getByRole("button", { name: "Copy thumbnail prompt" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Balcony compost starter kit on a bright table."));
  });
});
