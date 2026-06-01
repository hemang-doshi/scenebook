import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import type { WorkflowHandlerInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";

function workflowRequest(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null && "request" in input.workflowInput
    ? String((input.workflowInput as { request?: unknown }).request ?? "")
    : input.context.rawInput;
}

function workflowObject(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null
    ? input.workflowInput as { assetId?: unknown; folderId?: unknown }
    : {};
}

function extractAfter(pattern: RegExp, request: string) {
  return request.match(pattern)?.[1]?.trim() ?? null;
}

function parseShootTasks(request: string) {
  const raw = extractAfter(/add these as shoot tasks\s*:\s*(.+)$/i, request);
  if (!raw) {
    return null;
  }

  const tasks = raw
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return tasks.length > 0 ? tasks : null;
}

function isAmbiguousSave(request: string) {
  return /^\s*save (this|it)\.?\s*$/i.test(request);
}

async function runTool(input: WorkflowHandlerInput, toolName: string, rawInput: unknown) {
  return executeRuntimeV3Tool({
    toolName,
    rawInput,
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });
}

function askTarget() {
  return {
    waitingForUser: true,
    observations: [],
    finalResponse: "What should I save this as: hook, script, caption, CTA, shoot task, folder, or artifact?",
  };
}

export async function runWorkspaceControlWorkflow(input: WorkflowHandlerInput): Promise<WorkflowResult> {
  const request = workflowRequest(input);
  const object = workflowObject(input);

  if (typeof object.assetId === "string" && typeof object.folderId === "string") {
    const observation = await runTool(input, "move_asset_to_folder", {
      assetId: object.assetId,
      folderId: object.folderId,
    });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Asset moved and verified in the target folder."
        : `I could not move the asset: ${observation.message}`,
    };
  }

  if (isAmbiguousSave(request)) {
    return askTarget();
  }

  const hook = extractAfter(/(?:make this(?: the)? hook|use this as(?: the)? hook|hook)\s*:\s*(.+)$/i, request);
  if (hook) {
    const observation = await runTool(input, "update_script_lab", { hook });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Hook changed and verified in Script Lab."
        : `I could not save the hook: ${observation.message}`,
    };
  }

  const cta = extractAfter(/(?:make this(?: the)? cta|use this as(?: the)? cta|cta)\s*:\s*(.+)$/i, request);
  if (cta) {
    const observation = await runTool(input, "update_script_lab", { cta });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "CTA changed and verified in Script Lab."
        : `I could not save the CTA: ${observation.message}`,
    };
  }

  const caption = extractAfter(/(?:make this(?: the)? caption|use this as(?: the)? caption|caption)\s*:\s*(.+)$/i, request);
  if (caption) {
    const observation = await runTool(input, "update_script_lab", { caption });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Caption changed and verified in Script Lab."
        : `I could not save the caption: ${observation.message}`,
    };
  }

  const script = extractAfter(/(?:make this(?: the)? script|use this as(?: the)? script|script)\s*:\s*([\s\S]+)$/i, request);
  if (script) {
    const observation = await runTool(input, "update_script_lab", { script });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Script text changed and verified in Script Lab."
        : `I could not save the script text: ${observation.message}`,
    };
  }

  const tasks = parseShootTasks(request);
  if (tasks) {
    const observation = await runTool(input, "update_shoot_pack", { category: "aRoll", tasks });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Shoot tasks added and verified."
        : `I could not add the shoot tasks: ${observation.message}`,
    };
  }

  const folder = extractAfter(/(?:create|make|add)(?: an?)? (?:asset )?folder(?: named| called)?\s+([^.!?]+)$/i, request);
  if (folder) {
    const observation = await runTool(input, "create_asset_folder", { name: folder });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Asset folder is ready."
        : `I could not create the folder: ${observation.message}`,
    };
  }

  if (/\bmove\b.*\basset\b.*\bto\b/i.test(request)) {
    return {
      waitingForUser: true,
      observations: [],
      finalResponse: "Which asset should I move, and which exact folder should it go to?",
    };
  }

  if (/\b(instagram package|publish package|prepare instagram)\b/i.test(request)) {
    const observation = await runTool(input, "prepare_instagram_package", { request });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Instagram package prepared. Nothing was published."
        : `I could not prepare the Instagram package: ${observation.message}`,
    };
  }

  return askTarget();
}
