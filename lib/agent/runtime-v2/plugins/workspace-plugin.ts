import { z } from "zod";

import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";
import { createProjectArtifact } from "@/lib/agent/artifacts";
import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import { contentStatuses, type ContentStatus, type JsonValue } from "@/lib/types";

const updateCreativeBriefInputSchema = z.object({
  brief: z.record(z.string(), z.unknown()),
  overwrite: z.boolean().optional(),
});

const createProjectArtifactInputSchema = z.object({
  title: z.string().min(1),
  artifactType: z.string().min(1),
  content: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  overwrite: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateProjectStatusInputSchema = z.object({
  status: z.enum(contentStatuses),
  reason: z.string().optional(),
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

type ProjectArtifactOutput = Record<string, JsonValue> & {
  kind: "project_artifact";
  projectId: string;
  artifactType: string;
  title: string;
};

type ProjectStatusOutput = Record<string, JsonValue> & {
  kind: "project_status_update";
  projectId: string;
  previousStatus: ContentStatus;
  status: ContentStatus;
  statusChanged: boolean;
};

export const updateCreativeBriefTool: AgentRuntimeTool<UpdateCreativeBriefInput> = {
  name: "update_creative_brief",
  displayName: "Update Creative Brief",
  description: "Merges approved discovery fields into the project's persistent creative brief.",
  inputSchema: updateCreativeBriefInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    if (!ctx.project) {
      throw new Error("Project not found for creative brief update.");
    }

    const brief = toJsonRecord(input.brief);
    const updatedProject = await updateCard(ctx.projectId, {
      scriptLab: {
        ...ctx.project.scriptLab,
        notes: [
          ctx.project.scriptLab.notes,
          `Creative brief: ${JSON.stringify(brief)}`,
        ].filter(Boolean).join("\n"),
      },
    });

    return {
      message: "Creative brief updated.",
      output: {
        kind: "creative_brief_update",
        projectId: ctx.projectId,
        updatedFields: Object.keys(brief),
        scriptLab: scriptLabToJson(updatedProject.scriptLab),
      },
    };
  },
  displayFormatter: () => ({
    title: "Update Creative Brief",
    subtitle: "Persist creative brief updates.",
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const createProjectArtifactTool: AgentRuntimeTool<CreateProjectArtifactInput, ProjectArtifactOutput> = {
  name: "create_project_artifact",
  displayName: "Create Project Artifact",
  description: "Creates a named planning, script, prompt, or production artifact for the project.",
  inputSchema: createProjectArtifactInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    if (!ctx.threadId) {
      throw new Error("Thread id is required to create a project artifact.");
    }

    if (!ctx.toolCallId) {
      throw new Error("Tool call id is required to create a project artifact.");
    }

    const artifact = await createProjectArtifact({
      projectId: ctx.projectId,
      threadId: ctx.threadId,
      toolCallId: ctx.toolCallId,
      artifactType: input.artifactType,
      title: input.title,
      payload: toJsonRecord(input.payload ?? { content: input.content ?? "" }),
      metadata: toJsonRecord(input.metadata ?? {}),
    });

    const artifactId = isRecord(artifact) && typeof artifact.id === "string" ? artifact.id : "";

    return {
      message: "Project artifact created.",
      output: {
        kind: "project_artifact",
        artifactId,
        projectId: ctx.projectId,
        artifactType: input.artifactType,
        title: input.title,
      },
    };
  },
  displayFormatter: (input) => ({
    title: "Create Project Artifact",
    subtitle: input.title,
    metadata: {
      artifactType: input.artifactType,
      sideEffect: "db_write",
      approvalPolicy: "auto",
    },
  }),
};

export const updateProjectStatusTool: AgentRuntimeTool<UpdateProjectStatusInput, ProjectStatusOutput> = {
  name: "update_project_status",
  displayName: "Update Project Status",
  description: "Moves the project to another workspace status after approval.",
  inputSchema: updateProjectStatusInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  async handler(ctx, input) {
    if (!ctx.project) {
      throw new Error("Project not found for status update.");
    }

    const currentProject = await getProjectWorkspace(ctx.projectId);
    const previousStatus = currentProject?.status ?? ctx.project.status;
    const previousIndex = contentStatuses.indexOf(previousStatus);
    const nextIndex = contentStatuses.indexOf(input.status);

    if (input.status === previousStatus || (previousIndex >= 0 && nextIndex >= 0 && nextIndex <= previousIndex)) {
      return {
        message: "Project status unchanged.",
        output: {
          kind: "project_status_update",
          projectId: ctx.projectId,
          previousStatus,
          status: previousStatus,
          statusChanged: false,
        },
      };
    }

    const updatedProject = await updateCard(ctx.projectId, { status: input.status });

    return {
      message: `Project moved to ${input.status.replaceAll("_", " ")}.`,
      output: {
        kind: "project_status_update",
        projectId: ctx.projectId,
        previousStatus,
        status: updatedProject.status,
        statusChanged: updatedProject.status !== previousStatus,
      },
    };
  },
  displayFormatter: (input) => ({
    title: "Update Project Status",
    subtitle: input.status,
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "auto",
    },
  }),
};

export const updateShootPackTool: AgentRuntimeTool<UpdateShootPackInput> = {
  name: "update_shoot_pack",
  displayName: "Update Shoot Pack",
  description: "Applies approved A-roll, B-roll, prop, capture, and location notes to the shoot pack.",
  inputSchema: updateShootPackInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    if (!ctx.project) {
      throw new Error("Project not found for shoot pack update.");
    }

    const currentProject = await getProjectWorkspace(ctx.projectId);
    const currentShootPack = currentProject?.shootPack ?? ctx.project.shootPack;
    const nextShootPack = {
      ...currentShootPack,
      ...(input.aRoll ? { aRoll: mergeChecklist(currentShootPack.aRoll, input.aRoll) } : {}),
      ...(input.bRoll ? { bRoll: mergeChecklist(currentShootPack.bRoll, input.bRoll) } : {}),
      ...(input.screenCaptures ? { screenCaptures: mergeChecklist(currentShootPack.screenCaptures, input.screenCaptures) } : {}),
      ...(input.props ? { props: mergeChecklist(currentShootPack.props, input.props) } : {}),
      ...(input.missingAssets ? { missingAssets: mergeChecklist(currentShootPack.missingAssets, input.missingAssets) } : {}),
      ...(input.locationNotes !== undefined ? { locationNotes: input.locationNotes } : {}),
      ...(input.visualNotes !== undefined ? { visualNotes: input.visualNotes } : {}),
    };

    const updatedProject = await updateCard(ctx.projectId, {
      shootPack: nextShootPack,
    });
    const updatedFields = Object.entries(input)
      .filter(([key, value]) => key !== "overwrite" && value !== undefined)
      .map(([key]) => key);

    return {
      message: "Shoot pack updated.",
      output: {
        kind: "shoot_pack_update",
        projectId: ctx.projectId,
        updatedFields,
        shootPack: shootPackToJson(updatedProject.shootPack),
      },
    };
  },
  displayFormatter: () => ({
    title: "Update Shoot Pack",
    subtitle: "Apply production checklist updates.",
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "auto",
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

function toJsonRecord(input: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, toJsonValue(value)] as const)
      .filter((entry): entry is readonly [string, JsonValue] => entry[1] !== undefined),
  );
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(toJsonValue)
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (isRecord(value)) {
    return toJsonRecord(value);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeChecklist<T extends { id?: string; label: string; done?: boolean }>(
  current: Array<{ id: string; label: string; done: boolean }>,
  next: T[],
) {
  return [
    ...current,
    ...next.map((item, index) => ({
      id: item.id ?? `task-${Date.now()}-${index}`,
      label: item.label,
      done: item.done ?? false,
    })),
  ];
}

function scriptLabToJson(input: Record<string, string>): Record<string, JsonValue> {
  return toJsonRecord(input);
}

function shootPackToJson(input: Record<string, unknown>): Record<string, JsonValue> {
  return toJsonRecord(input);
}
