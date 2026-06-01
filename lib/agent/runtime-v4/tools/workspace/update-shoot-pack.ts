import { z } from "zod";

import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import type { ChecklistItem, JsonValue, ShootPack } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;
type ChecklistCategory = "aRoll" | "bRoll" | "screenCaptures" | "props" | "missingAssets";
type RequestedChecklistItem = {
  category: ChecklistCategory;
  label: string;
  done: boolean;
};
type AddedChecklistItem = RequestedChecklistItem & {
  id: string;
};

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const checklistCategories = ["aRoll", "bRoll", "screenCaptures", "props", "missingAssets"] as const;

const sceneInput = z.object({
  label: z.string().trim().min(1),
  category: z.enum(checklistCategories).default("bRoll"),
  done: z.boolean().default(false),
});

const assetInput = z.object({
  label: z.string().trim().min(1),
  category: z.enum(["props", "missingAssets"]).default("missingAssets"),
  done: z.boolean().default(false),
});

const shootPackInput = z.object({
  category: z.enum(checklistCategories).optional(),
  tasks: z.array(z.string().trim().min(1)).optional(),
  scenes: z.array(z.union([z.string().trim().min(1), sceneInput])).optional(),
  visualDirection: z.string().optional(),
  visualNotes: z.string().optional(),
  locationNotes: z.string().optional(),
  assets: z.array(z.union([z.string().trim().min(1), assetInput])).optional(),
});

type UpdateShootPackInput = z.infer<typeof shootPackInput>;

function checkedAt() {
  return new Date().toISOString();
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

function checklist(label: string, done = false): ChecklistItem {
  return {
    id: crypto.randomUUID(),
    label,
    done,
  };
}

function cloneShootPack(shootPack: ShootPack): ShootPack {
  return {
    aRoll: [...shootPack.aRoll],
    bRoll: [...shootPack.bRoll],
    screenCaptures: [...shootPack.screenCaptures],
    props: [...shootPack.props],
    missingAssets: [...shootPack.missingAssets],
    locationNotes: shootPack.locationNotes,
    visualNotes: shootPack.visualNotes,
  };
}

function addChecklistItem(input: {
  shootPack: ShootPack;
  addedItems: AddedChecklistItem[];
  category: ChecklistCategory;
  label: string;
  done?: boolean;
}) {
  const item = checklist(input.label, input.done ?? false);
  input.shootPack[input.category] = [...input.shootPack[input.category], item];
  input.addedItems.push({
    id: item.id,
    category: input.category,
    label: item.label,
    done: item.done,
  });
}

function requestedChecklistItems(input: UpdateShootPackInput): RequestedChecklistItem[] {
  const requested: RequestedChecklistItem[] = [];

  for (const task of input.tasks ?? []) {
    requested.push({
      category: input.category ?? "aRoll",
      label: task,
      done: false,
    });
  }

  for (const scene of input.scenes ?? []) {
    requested.push(typeof scene === "string"
      ? {
          category: "bRoll",
          label: scene,
          done: false,
        }
      : {
          category: scene.category ?? "bRoll",
          label: scene.label,
          done: scene.done ?? false,
        });
  }

  for (const asset of input.assets ?? []) {
    requested.push(typeof asset === "string"
      ? {
          category: "missingAssets",
          label: asset,
          done: false,
        }
      : {
          category: asset.category ?? "missingAssets",
          label: asset.label,
          done: asset.done ?? false,
        });
  }

  return requested;
}

function applyShootPackPatch(current: ShootPack, input: UpdateShootPackInput) {
  const next = cloneShootPack(current);
  const changedFields = new Set<string>();
  const addedItems: AddedChecklistItem[] = [];

  if (input.tasks?.length) {
    const category = input.category ?? "aRoll";
    for (const task of input.tasks) {
      addChecklistItem({
        shootPack: next,
        addedItems,
        category,
        label: task,
      });
    }
    changedFields.add(category);
  }

  for (const scene of input.scenes ?? []) {
    if (typeof scene === "string") {
      addChecklistItem({
        shootPack: next,
        addedItems,
        category: "bRoll",
        label: scene,
      });
      changedFields.add("bRoll");
    } else {
      const category = scene.category ?? "bRoll";
      addChecklistItem({
        shootPack: next,
        addedItems,
        category,
        label: scene.label,
        done: scene.done ?? false,
      });
      changedFields.add(category);
    }
  }

  for (const asset of input.assets ?? []) {
    if (typeof asset === "string") {
      addChecklistItem({
        shootPack: next,
        addedItems,
        category: "missingAssets",
        label: asset,
      });
      changedFields.add("missingAssets");
    } else {
      const category = asset.category ?? "missingAssets";
      addChecklistItem({
        shootPack: next,
        addedItems,
        category,
        label: asset.label,
        done: asset.done ?? false,
      });
      changedFields.add(category);
    }
  }

  const visualNotes = input.visualDirection ?? input.visualNotes;
  if (visualNotes !== undefined) {
    next.visualNotes = visualNotes;
    changedFields.add("visualNotes");
  }

  if (input.locationNotes !== undefined) {
    next.locationNotes = input.locationNotes;
    changedFields.add("locationNotes");
  }

  return {
    next,
    changedFields: [...changedFields],
    addedItems,
  };
}

function isChecklistCategory(value: unknown): value is ChecklistCategory {
  return typeof value === "string" && checklistCategories.includes(value as ChecklistCategory);
}

function parseAddedItems(value: unknown): AddedChecklistItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AddedChecklistItem =>
    Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof (item as AddedChecklistItem).id === "string" &&
      isChecklistCategory((item as AddedChecklistItem).category) &&
      typeof (item as AddedChecklistItem).label === "string" &&
      typeof (item as AddedChecklistItem).done === "boolean",
  );
}

function itemMatchesRequest(item: AddedChecklistItem, request: RequestedChecklistItem) {
  return item.category === request.category &&
    item.label === request.label &&
    item.done === request.done;
}

function hasPersistedAddedItems(actual: ShootPack, input: UpdateShootPackInput, output: JsonObject) {
  const requested = requestedChecklistItems(input);

  if (requested.length === 0) {
    return true;
  }

  const addedItems = parseAddedItems(output.addedItems);
  if (addedItems.length !== requested.length) {
    return false;
  }

  const outputMatchesRequest = addedItems.every((item, index) =>
    itemMatchesRequest(item, requested[index]),
  );

  if (!outputMatchesRequest) {
    return false;
  }

  return addedItems.every((item) =>
    actual[item.category].some((persisted) =>
      persisted.id === item.id &&
        persisted.label === item.label &&
        persisted.done === item.done,
    ),
  );
}

function hasRequestedState(actual: ShootPack, input: UpdateShootPackInput, output: JsonObject) {
  if (!hasPersistedAddedItems(actual, input, output)) {
    return false;
  }

  if (input.visualDirection !== undefined && actual.visualNotes !== input.visualDirection) {
    return false;
  }

  if (input.visualNotes !== undefined && input.visualDirection === undefined && actual.visualNotes !== input.visualNotes) {
    return false;
  }

  if (input.locationNotes !== undefined && actual.locationNotes !== input.locationNotes) {
    return false;
  }

  return true;
}

export const updateShootPackTool: AgentTool<UpdateShootPackInput, JsonObject> = {
  name: "update_shoot_pack",
  displayName: "Update Shoot Pack",
  description: "Updates scenes, visual direction, and asset checklist items in the current shoot pack.",
  inputSchema: shootPackInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const project = await getProjectWorkspace(context.projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const { next, changedFields, addedItems } = applyShootPackPatch(project.shootPack, input);
    if (changedFields.length === 0) {
      throw new Error("No shoot pack fields were provided.");
    }

    const updated = await updateCard(context.projectId, {
      shootPack: next,
    });

    return {
      kind: "shoot_pack_update",
      changedFields,
      addedItems,
      addedItemCount: addedItems.length,
      shootPack: toJsonObject(updated.shootPack),
    };
  },
  async verify(input, output, context) {
    const project = await getProjectWorkspace(context.projectId);
    const verified = Boolean(project && hasRequestedState(project.shootPack, input, output));

    return {
      verified,
      checkedAt: checkedAt(),
      expected: toJsonObject(input),
      actual: toJsonObject(project?.shootPack ?? null),
      output,
      reason: verified ? undefined : "Shoot pack re-read did not include the requested updates.",
    };
  },
};
