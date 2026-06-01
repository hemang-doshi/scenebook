import { z } from "zod";

const patchInputSchema = z.record(z.string(), z.unknown()).default({});

const patchOperationBaseSchema = {
  input: patchInputSchema,
  reason: z.string().optional(),
  requiresApproval: z.boolean().optional(),
};

export const updateCreativeBriefOperationSchema = z.object({
  type: z.literal("update_creative_brief"),
  ...patchOperationBaseSchema,
});

export const updateActiveGoalOperationSchema = z.object({
  type: z.literal("update_active_goal"),
  ...patchOperationBaseSchema,
});

export const createScriptVersionOperationSchema = z.object({
  type: z.literal("create_script_version"),
  ...patchOperationBaseSchema,
});

export const updateScriptLabOperationSchema = z.object({
  type: z.literal("update_script_lab"),
  ...patchOperationBaseSchema,
});

export const updateShootPackOperationSchema = z.object({
  type: z.literal("update_shoot_pack"),
  ...patchOperationBaseSchema,
});

export const createProjectArtifactOperationSchema = z.object({
  type: z.literal("create_project_artifact"),
  ...patchOperationBaseSchema,
});

export const recordProjectMemoryOperationSchema = z.object({
  type: z.literal("record_project_memory"),
  ...patchOperationBaseSchema,
});

export const projectPatchOperationSchema = z.discriminatedUnion("type", [
  updateCreativeBriefOperationSchema,
  updateActiveGoalOperationSchema,
  createScriptVersionOperationSchema,
  updateScriptLabOperationSchema,
  updateShootPackOperationSchema,
  createProjectArtifactOperationSchema,
  recordProjectMemoryOperationSchema,
]);

export const projectPatchSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().optional(),
  runId: z.string().optional(),
  authorUserId: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  reason: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high", "blocked"]).default("low"),
  requiresApproval: z.boolean().default(false),
  operations: z.array(projectPatchOperationSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ProjectPatchOperation = z.infer<typeof projectPatchOperationSchema>;
export type ProjectPatchOperationType = ProjectPatchOperation["type"];
export type ProjectPatch = z.infer<typeof projectPatchSchema>;

export const projectPatchOperationToolNames = {
  update_creative_brief: "update_creative_brief",
  update_active_goal: "update_active_goal",
  create_script_version: "create_script_version",
  update_script_lab: "update_script_lab",
  update_shoot_pack: "update_shoot_pack",
  create_project_artifact: "create_project_artifact",
  record_project_memory: "record_project_memory",
} as const satisfies Record<ProjectPatchOperationType, string>;

export type ProjectPatchToolName =
  (typeof projectPatchOperationToolNames)[ProjectPatchOperationType];

export function mapProjectPatchOperationToToolName(
  operation: { type: ProjectPatchOperationType; input?: unknown },
): ProjectPatchToolName {
  return projectPatchOperationToolNames[operation.type];
}
