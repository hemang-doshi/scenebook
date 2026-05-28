import { z } from "zod";

import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";
import { contentStatuses } from "@/lib/types";

const updateCreativeBriefInputSchema = z.object({
  brief: z.record(z.string(), z.unknown()),
  overwrite: z.boolean().optional(),
});

const createProjectArtifactInputSchema = z.object({
  title: z.string().min(1),
  artifactType: z.string().min(1),
  content: z.string().min(1),
  overwrite: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateProjectStatusInputSchema = z.object({
  status: z.enum(contentStatuses),
});

const shootPackChecklistItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  done: z.boolean().optional(),
});

const updateShootPackInputSchema = z.object({
  aRoll: z.array(shootPackChecklistItemSchema).optional(),
  bRoll: z.array(shootPackChecklistItemSchema).optional(),
  screenCaptures: z.array(shootPackChecklistItemSchema).optional(),
  props: z.array(shootPackChecklistItemSchema).optional(),
  missingAssets: z.array(shootPackChecklistItemSchema).optional(),
  locationNotes: z.string().optional(),
  visualNotes: z.string().optional(),
  overwrite: z.boolean().optional(),
});

type UpdateCreativeBriefInput = z.infer<typeof updateCreativeBriefInputSchema>;
type CreateProjectArtifactInput = z.infer<typeof createProjectArtifactInputSchema>;
type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusInputSchema>;
type UpdateShootPackInput = z.infer<typeof updateShootPackInputSchema>;

function notImplementedHandler(): never {
  throw new Error("Not implemented");
}

export const updateCreativeBriefTool: AgentRuntimeTool<UpdateCreativeBriefInput> = {
  name: "update_creative_brief",
  displayName: "Update Creative Brief",
  description: "Merges approved discovery fields into the project's persistent creative brief.",
  inputSchema: updateCreativeBriefInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
  displayFormatter: () => ({
    title: "Update Creative Brief",
    subtitle: "Persist creative brief updates.",
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const createProjectArtifactTool: AgentRuntimeTool<CreateProjectArtifactInput> = {
  name: "create_project_artifact",
  displayName: "Create Project Artifact",
  description: "Creates a named planning, script, prompt, or production artifact for the project.",
  inputSchema: createProjectArtifactInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Create Project Artifact",
    subtitle: input.title,
    metadata: {
      artifactType: input.artifactType,
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const updateProjectStatusTool: AgentRuntimeTool<UpdateProjectStatusInput> = {
  name: "update_project_status",
  displayName: "Update Project Status",
  description: "Moves the project to another workspace status after approval.",
  inputSchema: updateProjectStatusInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Update Project Status",
    subtitle: input.status,
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const updateShootPackTool: AgentRuntimeTool<UpdateShootPackInput> = {
  name: "update_shoot_pack",
  displayName: "Update Shoot Pack",
  description: "Applies approved A-roll, B-roll, prop, capture, and location notes to the shoot pack.",
  inputSchema: updateShootPackInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
  displayFormatter: () => ({
    title: "Update Shoot Pack",
    subtitle: "Apply production checklist updates.",
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const workspacePlugin: AgentPlugin = {
  name: "workspace",
  description: "Creative brief, artifact, status, and shoot-pack workspace operations.",
  capabilities: ["creative_brief", "project_artifacts", "project_status", "shoot_pack"],
  tools: [
    updateCreativeBriefTool,
    createProjectArtifactTool,
    updateProjectStatusTool,
    updateShootPackTool,
  ],
};
