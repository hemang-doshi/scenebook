import { generateText } from "@/lib/ai/client";
import { agentDecisionSchema } from "@/lib/agent/runtime-v3/decision/schemas";
import type { AgentDecision, ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";

function extractFirstJsonObject(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1] ?? "{}");
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not include JSON.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function isVagueScriptRequest(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized === "/script" || normalized === "write a script" || normalized === "make a script";
}

function parseHookSave(message: string): string | null {
  const match = message.match(/(?:make this(?: the)? hook|use this as(?: the)? hook|hook)\s*:\s*(.+)$/i);
  return match?.[1]?.trim() || null;
}

function parseShootTasks(message: string): string[] | null {
  const match = message.match(/add these as shoot tasks\s*:\s*(.+)$/i);
  if (!match?.[1]) {
    return null;
  }
  return match[1]
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAmbiguousSave(message: string) {
  return /^\s*save (this|it)\.?\s*$/i.test(message);
}

function looksLikeWorkspaceControl(message: string) {
  return (
    parseHookSave(message) ||
    parseShootTasks(message) ||
    isAmbiguousSave(message) ||
    /\b(cta|caption)\s*:/i.test(message) ||
    /\bmake this(?: the)? (hook|cta|caption|script)\s*:/i.test(message) ||
    /\b(add|create|make)\b.*\bfolder\b/i.test(message) ||
    /\bmove\b.*\b(asset|thumbnail|image|video|audio)\b.*\b(to|into)\b/i.test(message) ||
    /\b(instagram package|publish package|prepare instagram)\b/i.test(message)
  );
}

function looksLikePositioningCorrection(message: string) {
  const normalized = message.toLowerCase();
  const asksToChangeDirection = /\b(change this|change the positioning|something completely different|not just|not another|product thesis|real thesis|what scenebook is)\b/i
    .test(message);
  const namesSceneBook = /\bscenebook\b/.test(normalized);
  const describesProduct = /\b(creator os|creator operating system|creative workspace|production workspace|short-form creators?|short-form video|ai production workspace)\b/i
    .test(message);

  return namesSceneBook && describesProduct && asksToChangeDirection;
}

function looksLikeAssetRequest(message: string) {
  return /\b(generate|create|make)\b/i.test(message) && /\b(thumbnail|image|video|audio|asset|b-roll|voiceover)\b/i.test(message);
}

function inferModality(message: string): "image" | "video" | "audio" {
  if (/\b(audio|voiceover|sound|music)\b/i.test(message)) return "audio";
  if (/\b(video|b-roll|clip)\b/i.test(message)) return "video";
  return "image";
}

function toFinalAfterObservation(observation: ToolObservation): AgentDecision {
  if (observation.status === "completed") {
    return {
      type: "final_response",
      response: `${observation.message} Verified workspace changes are shown in the tool card.`,
      confidence: 0.9,
    };
  }

  if (observation.status === "awaiting_approval") {
    return {
      type: "final_response",
      response: `Approval is required before I make that workspace change: ${observation.message}`,
      confidence: 0.9,
    };
  }

  return {
    type: "final_response",
    response: `I could not complete that action: ${observation.message}`,
    confidence: 0.9,
  };
}

export async function decideNextStep(input: {
  message: string;
  snapshot: ProjectSnapshot;
  toolSummaries: unknown;
  previousObservations?: ToolObservation[];
  model?: string;
}): Promise<AgentDecision> {
  const latestObservation = input.previousObservations?.at(-1);
  if (latestObservation) {
    return toFinalAfterObservation(latestObservation);
  }

  const message = input.message.trim();
  if (looksLikePositioningCorrection(message)) {
    return {
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: message, mode: "positioning_update" },
      reason: "User corrected SceneBook positioning and asked the workspace to change.",
    };
  }

  if (looksLikeWorkspaceControl(message)) {
    return {
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: message },
      reason: "User requested a direct workspace control action.",
    };
  }

  if (isVagueScriptRequest(message)) {
    return {
      type: "ask_question",
      questions: [
        "Who is this for?",
        "What is the core angle or promise?",
        "What tone should it have?",
      ],
      reason: "Script request is too vague to produce a useful package.",
      expectedFieldTargets: ["audience", "coreAngle", "tone"],
    };
  }

  if (/script|rewrite|punchier/i.test(message)) {
    return {
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: message },
      reason: "User requested script generation or improvement.",
    };
  }

  if (looksLikeAssetRequest(message)) {
    return {
      type: "workflow_call",
      workflowName: "asset_workflow",
      input: {
        prompt: message,
        modality: inferModality(message),
      },
      reason: "User requested media asset generation.",
    };
  }

  if (/take this from idea to publish|idea to publish|end-to-end/i.test(message)) {
    return {
      type: "workflow_call",
      workflowName: "goal_workflow",
      input: { title: "Take project from idea to publish" },
      reason: "User asked for an active end-to-end project goal.",
    };
  }

  if (/editor|rough cut|timeline|handoff/i.test(message)) {
    return {
      type: "workflow_call",
      workflowName: "editor_handoff_workflow",
      input: { request: message },
      reason: "Editor timeline writes are unavailable; create handoff artifact instead.",
    };
  }

  if (/publish|instagram|caption|hashtags/i.test(message)) {
    return {
      type: "workflow_call",
      workflowName: "publish_workflow",
      input: { request: message },
      reason: "User requested publish preparation.",
    };
  }

  const prompt = [
    "Return one JSON object for the next SceneBook agent action.",
    "Allowed decision types: final_response, ask_question, propose_plan, tool_call, workflow_call, stop_with_error.",
    "Prefer final_response for brainstorming or explanatory answers that do not need workspace mutation.",
    `Project snapshot:\n${JSON.stringify(input.snapshot)}`,
    `Available tools:\n${JSON.stringify(input.toolSummaries)}`,
    `User message:\n${message}`,
  ].join("\n\n");

  let response = "";
  try {
    response = await generateText({
      prompt,
      systemInstruction: "You are SceneBook's structured agent decision engine. Return strict JSON only.",
      modelOverride: input.model,
    });
    return agentDecisionSchema.parse(extractFirstJsonObject(response));
  } catch {
    const repaired = await generateText({
      prompt: [
        "Repair this into a valid SceneBook AgentDecision JSON object.",
        "If uncertain, return a final_response decision.",
        `Malformed response:\n${response}`,
      ].join("\n\n"),
      systemInstruction: "Return strict JSON only.",
      modelOverride: input.model,
    });
    return agentDecisionSchema.parse(extractFirstJsonObject(repaired));
  }
}
