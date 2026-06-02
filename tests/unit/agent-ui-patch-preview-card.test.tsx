import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PatchPreviewCard } from "@/components/agent/patch-preview-card";
import type { PatchTimelineEntry } from "@/components/agent/types";

const patchEntry: PatchTimelineEntry = {
  id: "patch-entry-1",
  kind: "patch",
  patchId: "patch-1",
  title: "Save full production package",
  summary: "Persist the production plan, script, shoot pack, assets, and publish prep.",
  status: "planned",
  riskLevel: "low",
  requiresApproval: false,
  canApply: true,
  autoApplySkippedReason: "Patch has 9 operations; auto-apply limit is 8.",
  operations: [
    {
      operationIndex: 0,
      type: "update_creative_brief",
      status: "planned",
      reason: "Refresh the creative direction.",
    },
    {
      operationIndex: 1,
      type: "create_script_version",
      status: "planned",
      reason: "Save the drafted script.",
    },
  ],
  createdAt: "2026-06-02T09:00:00.000Z",
};

describe("PatchPreviewCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("patch preview renders operation list", () => {
    render(<PatchPreviewCard entry={patchEntry} projectId="project-1" />);

    expect(screen.getByText("Save full production package")).toBeInTheDocument();
    expect(screen.getByText("Persist the production plan, script, shoot pack, assets, and publish prep.")).toBeInTheDocument();
    expect(screen.getByText("Patch has 9 operations; auto-apply limit is 8.")).toBeInTheDocument();
    expect(screen.getByText("Update creative brief")).toBeInTheDocument();
    expect(screen.getByText("Create script version")).toBeInTheDocument();
    expect(screen.getByText("Refresh the creative direction.")).toBeInTheDocument();
  });

  test("apply button calls patch apply endpoint and updates status while triggering refresh", async () => {
    const onRefresh = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          patchId: "patch-1",
          status: "completed",
          operations: [
            {
              operationIndex: 0,
              type: "update_creative_brief",
              status: "completed",
              message: "Updated creative brief.",
            },
            {
              operationIndex: 1,
              type: "create_script_version",
              status: "completed",
              message: "Saved script version.",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<PatchPreviewCard entry={patchEntry} projectId="project-1" onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: /apply to workspace/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/project-1/agent/patches/patch-1/apply",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();

    expect(await screen.findByText("Updated creative brief.")).toBeInTheDocument();
    expect(screen.getByText("Saved script version.")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test("apply is hidden when patch is awaiting approval and explains approval is needed", () => {
    render(
      <PatchPreviewCard
        entry={{
          ...patchEntry,
          status: "awaiting_approval",
          requiresApproval: true,
          canApply: true,
        }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to workspace/i })).not.toBeInTheDocument();
    expect(screen.getByText(/approval is needed before this patch can be applied/i)).toBeInTheDocument();
  });

  test("apply is hidden when patch is completed", () => {
    render(
      <PatchPreviewCard
        entry={{ ...patchEntry, status: "completed", canApply: true }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to workspace/i })).not.toBeInTheDocument();
  });

  test("apply is hidden while patch is applying", () => {
    render(
      <PatchPreviewCard
        entry={{ ...patchEntry, status: "applying", canApply: true }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to workspace/i })).not.toBeInTheDocument();
  });

  test.each(["failed", "partial_failed"])("apply is hidden when patch is %s", (status) => {
    render(
      <PatchPreviewCard
        entry={{ ...patchEntry, status, canApply: true }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to workspace/i })).not.toBeInTheDocument();
  });

  test("apply is visible only for planned patches explicitly marked applicable", () => {
    const { rerender } = render(
      <PatchPreviewCard
        entry={{ ...patchEntry, status: "planned", canApply: false }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to workspace/i })).not.toBeInTheDocument();

    rerender(
      <PatchPreviewCard
        entry={{ ...patchEntry, status: "planned", canApply: true }}
        projectId="project-1"
      />,
    );

    expect(screen.getByRole("button", { name: /apply to workspace/i })).toBeInTheDocument();
  });

  test("apply is hidden when a planned applicable patch requires approval", () => {
    render(
      <PatchPreviewCard
        entry={{
          ...patchEntry,
          status: "planned",
          requiresApproval: true,
          canApply: true,
        }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to workspace/i })).not.toBeInTheDocument();
  });

  test("apply renders returned operations even when the local preview was empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          patchId: "patch-1",
          status: "completed",
          operations: [
            {
              operationIndex: 0,
              type: "record_project_memory",
              status: "completed",
              message: "Recorded project memory.",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PatchPreviewCard
        entry={{ ...patchEntry, operations: [] }}
        projectId="project-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /apply to workspace/i }));

    expect(await screen.findByText("Record project memory")).toBeInTheDocument();
    expect(screen.getByText("Recorded project memory.")).toBeInTheDocument();
  });

  test("empty operation error objects do not render as failures", () => {
    render(
      <PatchPreviewCard
        entry={{
          ...patchEntry,
          operations: [
            {
              operationIndex: 0,
              type: "update_creative_brief",
              status: "planned",
              error: {},
            },
          ],
        }}
        projectId="project-1"
      />,
    );

    expect(screen.queryByText("Operation failed.")).not.toBeInTheDocument();
  });
});
