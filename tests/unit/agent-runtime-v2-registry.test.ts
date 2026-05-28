import { describe, expect, test } from "vitest";

import type { ProjectWorkspace } from "@/lib/data/repository";
import {
  agentRuntimeTools,
  getAvailablePluginsForProject,
  getToolByName,
} from "@/lib/agent/runtime-v2/tools/registry";

const baseProject = {
  id: "project-1",
  title: "Desk lighting reel",
  platform: "instagram",
  format: "reel",
  status: "editing",
} as ProjectWorkspace;

describe("Agent Runtime v2 tool registry", () => {
  test("registers the Phase 4 plugin tool set", () => {
    expect(agentRuntimeTools.map((tool) => tool.name)).toEqual([
      "generate_script_package",
      "critique_script",
      "update_script_lab",
      "update_creative_brief",
      "create_project_artifact",
      "update_project_status",
      "update_shoot_pack",
      "generate_prompt_json",
      "generate_media_asset",
      "create_asset_folder",
      "move_asset_to_folder",
      "attach_asset_to_project",
      "import_asset_to_editor",
      "prepare_instagram_post",
      "publish_to_instagram",
    ]);
  });

  test("returns tools by name with approval policy metadata", () => {
    expect(getToolByName("generate_script_package")?.approvalPolicy).toBe("auto");
    expect(getToolByName("create_project_artifact")?.approvalPolicy).toBe("auto");
    expect(getToolByName("publish_to_instagram")?.approvalPolicy).toBe("always");
    expect(getToolByName("missing_tool")).toBeUndefined();
  });

  test("returns the available plugin set for an Instagram project", () => {
    const plugins = getAvailablePluginsForProject(baseProject);

    expect(plugins.map((plugin) => plugin.name)).toEqual([
      "script",
      "workspace",
      "assets",
      "editor",
      "instagram",
    ]);
    expect(plugins.flatMap((plugin) => plugin.capabilities)).toContain("publishing");
  });

  test("omits the Instagram plugin for non-Instagram projects", () => {
    const plugins = getAvailablePluginsForProject({
      ...baseProject,
      platform: "youtube",
    });

    expect(plugins.map((plugin) => plugin.name)).not.toContain("instagram");
  });
});
