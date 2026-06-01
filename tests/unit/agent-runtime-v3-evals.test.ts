import { beforeEach, describe, expect, test, vi } from "vitest";

import { runtimeV3TrajectoryFixtures } from "@/lib/agent/runtime-v3/evals/fixtures";
import { runTrajectoryFixture } from "@/lib/agent/runtime-v3/evals/trajectory-runner";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";

const { executeRuntimeV3Tool } = vi.hoisted(() => ({
  executeRuntimeV3Tool: vi.fn(),
}));

vi.mock("@/lib/agent/runtime-v3/tools/executor", () => ({
  executeRuntimeV3Tool,
}));

function observation(
  toolName: string,
  output: Record<string, unknown> = {},
  status: ToolObservation["status"] = "completed",
): ToolObservation {
  return {
    toolName,
    toolCallId: `${toolName}-call`,
    status,
    message:
      status === "awaiting_approval"
        ? "Approval required before changing finalized workspace state."
        : status === "blocked"
          ? "Publish To Instagram is requires_integration."
          : status === "failed"
            ? "Media model unavailable."
            : `${toolName} completed.`,
    output: output as Record<string, never>,
  };
}

function mockToolExecution() {
  executeRuntimeV3Tool.mockImplementation(
    async ({
      toolName,
      context,
      rawInput,
    }: {
      toolName: string;
      context: { rawInput: string; snapshot: { project: { status: string } } };
      rawInput: Record<string, unknown>;
    }) => {
      if (toolName === "generate_script_package") {
        return observation(toolName, {
          kind: "script_package",
          hook: "I wasted six months planning content instead of posting.",
          outline: "Open with confession\nShow the dashboard\nEnd with the lesson",
          script:
            "I spent six months planning the perfect content system. Then I realized posting teaches faster than planning.",
          caption: "Build in public before it feels ready.",
          cta: "Follow for the build notes.",
          onScreenText: "Planning is not publishing.",
        });
      }
      if (toolName === "critique_script") {
        return observation(toolName, {
          kind: "script_critique",
          critique: "The hook is specific and the payoff is clear.",
        });
      }
      if (toolName === "update_script_lab") {
        if (context.snapshot.project.status === "posted") {
          return observation(toolName, { kind: "approval_request" }, "awaiting_approval");
        }
        return observation(toolName, { kind: "script_lab_update", patch: rawInput });
      }
      if (toolName === "create_script_version") {
        return observation(toolName, { kind: "script_version", versionId: "version-1", active: true });
      }
      if (toolName === "create_project_artifact") {
        return observation(toolName, { kind: "project_artifact", artifactId: "artifact-1" });
      }
      if (toolName === "update_active_goal") {
        return observation(toolName, { kind: "active_goal", stage: rawInput.stage ?? "scripting" });
      }
      if (toolName === "update_shoot_pack") {
        return observation(toolName, { kind: "shoot_pack_update", addedTasks: rawInput.tasks });
      }
      if (toolName === "generate_prompt_json") {
        return observation(toolName, {
          kind: "prompt_json",
          modality: rawInput.modality ?? "image",
          prompt: "Cinematic vertical thumbnail of the SceneBook dashboard with warm monitor light.",
          aspect_ratio: "9:16",
          subject: { primary: "SceneBook dashboard" },
          scene: { environment: "creator desk setup" },
          camera: { shot_type: "close-up" },
          lighting: { style: "warm monitor glow" },
          style: { aesthetic: "cinematic product still" },
          parameters: { guidance: 7 },
        });
      }
      if (toolName === "create_asset_folder") {
        return observation(toolName, {
          kind: "asset_folder",
          folderId: "folder-thumbnails",
          folderName: "Thumbnails",
        });
      }
      if (toolName === "generate_media_asset") {
        if (context.rawInput.includes("media model unavailable")) {
          return observation(toolName, { kind: "tool_error", message: "Media model unavailable." }, "failed");
        }
        return observation(toolName, {
          kind: "media_asset",
          assetId: "asset-1",
          generationId: "generation-1",
          url: "https://example.com/asset.png",
          folderId: "folder-thumbnails",
          folderName: "Thumbnails",
          model: "sdxl",
          provider: "huggingface",
          prompt: "Cinematic vertical thumbnail of the SceneBook dashboard with warm monitor light.",
          modality: "image",
        });
      }
      if (toolName === "move_asset_to_folder") {
        return observation(toolName, {
          kind: "asset_move",
          assetId: rawInput.assetId,
          folderId: rawInput.folderId,
        });
      }
      if (toolName === "prepare_editor_handoff") {
        return observation(toolName, {
          kind: "editor_handoff",
          timelineMutationAvailable: false,
        });
      }
      if (toolName === "prepare_instagram_package") {
        return observation(toolName, {
          kind: "instagram_package",
          publishIntegrationAvailable: false,
        });
      }
      if (toolName === "publish_to_instagram") {
        return observation(toolName, { kind: "tool_blocked", reason: "requires_integration" }, "blocked");
      }
      return observation(toolName);
    },
  );
}

describe("runtime-v3 trajectory evals", () => {
  beforeEach(() => {
    vi.resetModules();
    executeRuntimeV3Tool.mockReset();
    mockToolExecution();
  });

  test("exports the required Phase 8A fixtures", () => {
    expect(runtimeV3TrajectoryFixtures.map((fixture) => fixture.id)).toEqual([
      "T-001",
      "T-002",
      "T-003",
      "T-004",
      "T-005",
      "T-006",
      "T-007",
      "T-008",
      "T-009",
      "T-010",
      "T-011",
      "T-012",
      "T-013",
      "T-014",
      "T-015",
    ]);
  });

  test.each(runtimeV3TrajectoryFixtures)("$id $name", async (fixture) => {
    const result = await runTrajectoryFixture(fixture);

    expect(result.failures).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
