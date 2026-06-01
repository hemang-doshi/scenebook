import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { WorkflowHandlerInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";
import type { JsonValue } from "@/lib/types";

function isTooVague(prompt: string) {
  const words = prompt.split(/\s+/).filter(Boolean);
  return words.length < 7 || !/\b(image|thumbnail|video|audio|voiceover|b-roll|scene|shot|asset)\b/i.test(prompt);
}

function source(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null
    ? input.workflowInput as { prompt?: unknown; modality?: unknown; folderName?: unknown }
    : {};
}

function prompt(input: WorkflowHandlerInput) {
  return String(source(input).prompt ?? input.context.rawInput);
}

function inferModality(value: string, rawModality?: unknown): "image" | "video" | "audio" {
  if (rawModality === "audio" || rawModality === "video" || rawModality === "image") {
    return rawModality;
  }
  if (/\b(audio|voiceover|sound|music)\b/i.test(value)) return "audio";
  if (/\b(video|b-roll|clip|scene|shot)\b/i.test(value)) return "video";
  return "image";
}

function explicitFolderName(value: string, rawFolderName?: unknown) {
  if (typeof rawFolderName === "string" && rawFolderName.trim()) {
    return rawFolderName.trim();
  }

  const match = value.match(/\b(?:save|put|place|store|file)\s+(?:it|this|asset|image|video|audio)?\s*(?:in|into|to)\s+([A-Z][\w -]{1,60})(?:[.!?]|$)/i)
    ?? value.match(/\bin\s+([A-Z][\w -]{1,60})\s*(?:folder)?(?:[.!?]|$)/i);
  return match?.[1]?.replace(/\s+folder$/i, "").trim() || null;
}

function defaultFolderName(modality: "image" | "video" | "audio", value: string) {
  if (/\bthumbnail|cover\b/i.test(value)) return "Thumbnails";
  if (modality === "audio") return "Audio";
  if (modality === "video") return /\bb-roll\b/i.test(value) ? "B-roll" : "Videos";
  return "Images";
}

function titleForAsset(value: string, modality: "image" | "video" | "audio", folderName: string) {
  if (/thumbnail/i.test(folderName) || /\bthumbnail\b/i.test(value)) return "Thumbnail";
  if (modality === "audio") return "Audio concept";
  if (modality === "video") return "Video concept";
  return "Image concept";
}

function outputObject(observation: ToolObservation) {
  return (observation.output ?? {}) as Record<string, JsonValue>;
}

function promptJson(observation: ToolObservation) {
  return outputObject(observation);
}

function stringFromOutput(observation: ToolObservation, key: string) {
  const value = observation.output?.[key];
  return typeof value === "string" ? value : "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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

async function updateGoal(input: WorkflowHandlerInput, observations: ToolObservation[], assetTitle: string) {
  if (!input.snapshot.activeGoal) {
    return;
  }

  const observation = await runTool(input, "update_active_goal", {
    title: input.snapshot.activeGoal.title,
    stage: "generating_assets",
    completedSteps: unique([...input.snapshot.activeGoal.completedSteps, "asset generated"]),
    nextActions: [`Review ${assetTitle}`, "Prepare editor handoff"],
    blockers: input.snapshot.activeGoal.blockers,
  });
  observations.push(observation);
}

function assetFinalResponse(asset: ToolObservation) {
  const assetId = stringFromOutput(asset, "assetId");
  const folderName = stringFromOutput(asset, "folderName");
  const model = stringFromOutput(asset, "model");
  const provider = stringFromOutput(asset, "provider");

  return [
    "Media asset generated and verified.",
    assetId ? `Asset: ${assetId}.` : "",
    folderName ? `Folder: ${folderName}.` : "",
    model || provider ? `Model: ${[provider, model].filter(Boolean).join(" / ")}.` : "",
  ].filter(Boolean).join(" ");
}

export async function runAssetWorkflow(input: WorkflowHandlerInput): Promise<WorkflowResult> {
  const request = prompt(input);
  const modality = inferModality(request, source(input).modality);

  if (isTooVague(request)) {
    return {
      waitingForUser: true,
      observations: [],
      finalResponse: "I need a more specific asset direction before generating media: subject, scene, and style.",
    };
  }

  const observations: ToolObservation[] = [];
  const promptObservation = await runTool(input, "generate_prompt_json", {
    prompt: request,
    modality,
  });
  observations.push(promptObservation);

  if (promptObservation.status !== "completed") {
    return {
      observations,
      finalResponse: `I could not prepare prompt JSON for the asset: ${promptObservation.message}`,
    };
  }

  const folderName = explicitFolderName(request, source(input).folderName) ?? defaultFolderName(modality, request);
  const folder = await runTool(input, "create_asset_folder", { name: folderName });
  observations.push(folder);

  if (folder.status !== "completed") {
    return {
      observations,
      finalResponse: `I could not prepare the asset folder: ${folder.message}`,
    };
  }

  const folderId = stringFromOutput(folder, "folderId");
  const title = titleForAsset(request, modality, folderName);
  const generated = await runTool(input, "generate_media_asset", {
    prompt: stringFromOutput(promptObservation, "prompt") || request,
    modality,
    folderId,
    title,
    structuredPrompt: promptJson(promptObservation),
    negativePrompt: stringFromOutput(promptObservation, "negative_prompt") || undefined,
    parameters: typeof promptObservation.output?.parameters === "object" && promptObservation.output.parameters !== null
      ? promptObservation.output.parameters
      : undefined,
  });
  observations.push(generated);

  if (generated.status !== "completed") {
    return {
      observations,
      finalResponse: `Media generation did not complete: ${generated.message}`,
    };
  }

  await updateGoal(input, observations, title);

  return {
    observations,
    finalResponse: assetFinalResponse(generated),
  };
}
