import { describe, expect, test } from "vitest";

import {
  activityForRuntimeV4Event,
  runtimeV4EventFromLegacyPacket,
  runtimeV4EventFromPacket,
  timelineEntriesFromRuntimeV4Event,
} from "@/components/agent/runtime-v4-event-adapter";
import { upsertTimelineEntries } from "@/components/agent/timeline-merge";
import type { AgentTimelineEntry } from "@/components/agent/types";

describe("agent chat island timeline adapters", () => {
  test("v4_event workflow_patch_planned creates patch card with patchId", () => {
    const event = runtimeV4EventFromPacket({
      type: "v4_event",
      event: {
        type: "workflow_patch_planned",
        runId: "run-1",
        workflowName: "create_full_production_package",
        patch: {
          id: "patch-1",
          title: "Save full production package",
          summary: "Save all generated sections.",
          operations: [{ type: "create_project_artifact", reason: "Persist package." }],
        },
      },
    });

    const entries = timelineEntriesFromRuntimeV4Event(event);

    expect(entries).toEqual([
      expect.objectContaining({
        kind: "patch",
        patchId: "patch-1",
        title: "Save full production package",
        status: "planned",
        operations: [
          expect.objectContaining({
            operationIndex: 0,
            type: "create_project_artifact",
            status: "planned",
          }),
        ],
      }),
    ]);
  });

  test("v4_event workflow_completed creates workflow card and artifact previews", () => {
    const entries = timelineEntriesFromRuntimeV4Event({
      type: "workflow_completed",
      runId: "run-1",
      workflowName: "create_full_production_package",
      message: "Complete package ready.",
      observation: {
        output: {
          artifacts: [
            {
              id: "artifact-1",
              type: "full_production_package",
              title: "Full production package",
              summary: "Complete package ready.",
              payload: { plan: { hook: "Open with the beach reveal." } },
            },
          ],
          patchId: "patch-1",
          patchTitle: "Save full production package",
        },
      },
    });

    expect(entries).toEqual([
      expect.objectContaining({
        kind: "workflow",
        workflowName: "create_full_production_package",
        status: "completed",
        artifacts: [
          expect.objectContaining({
            kind: "artifact",
            artifactType: "full_production_package",
            title: "Full production package",
          }),
        ],
      }),
      expect.objectContaining({
        kind: "patch",
        patchId: "patch-1",
        title: "Save full production package",
      }),
    ]);
  });

  test("timeline adapter dedupes workflow patch artifact noise", () => {
    const existing: AgentTimelineEntry[] = timelineEntriesFromRuntimeV4Event({
      type: "workflow_completed",
      runId: "run-1",
      workflowName: "create_script_package",
      message: "Script ready.",
      observation: {
        output: {
          artifacts: [
            {
              id: "artifact-1",
              type: "script_package",
              title: "Script package",
              payload: { summary: "First summary." },
            },
          ],
          patchId: "patch-1",
          patchTitle: "Save script package",
        },
      },
    });
    const incoming: AgentTimelineEntry[] = [
      ...timelineEntriesFromRuntimeV4Event({
        type: "workflow_completed",
        runId: "run-1",
        workflowName: "create_script_package",
        message: "Script ready with edits.",
        observation: {
          output: {
            artifacts: [
              {
                id: "artifact-1",
                type: "script_package",
                title: "Script package",
                payload: { summary: "Updated summary." },
              },
            ],
            patchId: "patch-1",
            patchTitle: "Save script package",
          },
        },
      }),
      ...timelineEntriesFromRuntimeV4Event({
        type: "patch_operation_running",
        runId: "run-1",
        patch: {
          id: "patch-1",
          title: "Save script package",
          operations: [{ type: "create_project_artifact" }],
        },
        operationIndex: 0,
      }),
    ];

    const merged = upsertTimelineEntries(existing, incoming);

    expect(merged.filter((entry) => entry.kind === "workflow")).toHaveLength(1);
    expect(merged.filter((entry) => entry.kind === "patch")).toHaveLength(1);
    expect(merged.filter((entry) => entry.kind === "artifact")).toHaveLength(0);
    expect(merged.find((entry) => entry.kind === "workflow")).toEqual(expect.objectContaining({
      artifacts: [
        expect.objectContaining({
          id: "artifact-1",
          payload: { summary: "Updated summary." },
        }),
      ],
    }));
    expect(merged.find((entry) => entry.kind === "patch")).toEqual(expect.objectContaining({
      patchId: "patch-1",
      operations: [
        expect.objectContaining({
          operationIndex: 0,
          status: "running",
        }),
      ],
    }));
  });

  test("title-only workflow artifact events do not leave generic duplicate cards", () => {
    const artifactCreated = timelineEntriesFromRuntimeV4Event({
      type: "workflow_artifact_created",
      runId: "run-1",
      workflowName: "create_full_production_package",
      message: "Full production package",
    });
    const workflowCompleted = timelineEntriesFromRuntimeV4Event({
      type: "workflow_completed",
      runId: "run-1",
      workflowName: "create_full_production_package",
      message: "Complete package ready.",
      observation: {
        output: {
          artifacts: [
            {
              id: "artifact-1",
              type: "full_production_package",
              title: "Full production package",
              payload: { plan: { hook: "Open with the beach reveal." } },
            },
          ],
        },
      },
    });

    const merged = upsertTimelineEntries([], [...artifactCreated, ...workflowCompleted]);

    expect(artifactCreated).toEqual([]);
    expect(merged.filter((entry) => entry.kind === "artifact")).toHaveLength(0);
    expect(merged.find((entry) => entry.kind === "workflow")).toEqual(expect.objectContaining({
      artifacts: [
        expect.objectContaining({
          id: "artifact-1",
          artifactType: "full_production_package",
        }),
      ],
    }));
  });

  test("generic legacy tool packets are adapted outside AgentChatIsland", () => {
    const completedEvent = runtimeV4EventFromLegacyPacket({
      type: "tool_completed",
      runId: "run-1",
      toolCallId: "tool-1",
      toolName: "script_builder",
      displayName: "Script Builder",
      command: "script",
      output: {
        kind: "script_package",
        hook: "Open with the contrast.",
      },
    });
    const approvalEvent = runtimeV4EventFromLegacyPacket({
      type: "approval_required",
      runId: "run-1",
      toolCallId: "tool-2",
      toolName: "publish",
      risk: "high",
      reason: "External publish action.",
    });

    expect(timelineEntriesFromRuntimeV4Event(completedEvent ?? {})).toEqual([
      expect.objectContaining({
        kind: "tool",
        id: "tool-1",
        toolName: "Script Builder",
        command: "script",
        status: "completed",
        output: expect.objectContaining({ kind: "script_package" }),
      }),
    ]);
    expect(activityForRuntimeV4Event(completedEvent ?? {})).toEqual({ label: "done" });
    expect(timelineEntriesFromRuntimeV4Event(approvalEvent ?? {})).toEqual([
      expect.objectContaining({
        kind: "tool",
        id: "tool-2",
        status: "awaiting_approval",
        requiresApproval: true,
        output: expect.objectContaining({
          kind: "approval_request",
          reason: "External publish action.",
        }),
      }),
    ]);
    expect(activityForRuntimeV4Event(approvalEvent ?? {})).toEqual({ label: "approval required", tone: "warning" });
  });
});
