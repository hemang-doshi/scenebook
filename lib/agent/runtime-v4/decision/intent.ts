import type { ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { AgentCommand, AgentIntentHint } from "@/lib/agent/types";
import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";

export type DecisionEngineInput = {
  message: string;
  effectivePrompt?: string | null;
  commandHint?: AgentCommand | null;
  commandInput?: string | null;
  intentHint?: AgentIntentHint | null;
  snapshot: ProjectSnapshot;
  toolSummaries: unknown;
  previousObservations?: ToolObservation[];
  model?: string;
};

function compactJson(value: unknown) {
  return JSON.stringify(value);
}

export type DecisionPrompt = {
  system: string;
  prompt: string;
  model?: string;
};

export function createDecisionPrompt(input: DecisionEngineInput): DecisionPrompt {
  const commandHint = input.commandHint
    ? `Slash command hint: /${input.commandHint}${input.commandInput?.trim() ? `\nCommand input:\n${input.commandInput.trim()}` : ""}`
    : "Slash command hint: none";
  const intentHint = input.intentHint
    ? `Intent hint: /${input.intentHint}. Treat this as guidance, not a command. Strip the hint from the effective user prompt before deciding.`
    : "Intent hint: none";
  const effectivePrompt = commandPrompt(input);
  return {
    model: input.model,
    system: "You are SceneBook's runtime-v4 model-first decision engine. Return structured output only.",
    prompt: [
      "Return exactly one JSON object for the next SceneBook agent action.",
      "Choose the decision with the best next step for the user's goal.",
      "Allowed decision types: ask_question, propose_plan, tool_call, project_patch, workflow_call, final_response, stop_with_error.",
      "SceneBook's primary job is to be a conversational creative partner. Treat normal conversation, creative brainstorming, critique, advice, and requested drafts as real work.",
      "Use final_response whenever you can satisfy the user by talking, reasoning, drafting, listing ideas, writing hooks, captions, scripts, shot ideas, shoot packs, or recommendations directly in chat.",
      "A final_response can contain complete generated creative output. It is not a failure path.",
      "Do not choose a workflow or tool merely because one exists. Use tools/workflows only when they materially help or when the user asks to save, stage, update, generate external media, or create durable workspace artifacts.",
      "Prefer model reasoning over hard-coded intent rules.",
      "Use ask_question when the request is too vague to produce a useful result.",
      "Use workflow_call for v4 creative workflows: plan_reel, create_script_package, create_shoot_pack, create_asset_prompt_pack, review_content, prepare_publish_package, and create_full_production_package.",
      "Use create_full_production_package when the user asks for the whole reel package, entire production plan, everything needed to shoot, complete video package, or end-to-end package.",
      "Prefer narrower workflows for specific requests: plan_reel for vague early creative requests, create_script_package for writing scripts, create_shoot_pack for shot lists, create_asset_prompt_pack for asset prompts, review_content for critique, and prepare_publish_package for captions/hashtags.",
      "Use tool_call for one focused runtime tool when a workflow is unnecessary.",
      "Use project_patch for grouped durable workspace updates that should apply as one reviewed ProjectPatch.",
      "Do not finalize only because a previous tool observation exists. Consider whether the original user goal is complete.",
      "Resolve short follow-ups, pronouns, and phrases like 'all of them', 'do it', 'make that', or 'draft everything' against ProjectMind conversationContext before asking clarification or proposing a fresh plan.",
      commandHint,
      intentHint,
      `Project snapshot:\n${compactJson(input.snapshot)}`,
      `Available tools:\n${compactJson(input.toolSummaries)}`,
      `Previous observations:\n${compactJson(input.previousObservations ?? [])}`,
      `Raw user message:\n${input.message.trim()}`,
      `Effective user prompt:\n${effectivePrompt}`,
    ].join("\n\n"),
  };
}

function summarizedToolNames(toolSummaries: unknown) {
  if (!Array.isArray(toolSummaries)) {
    return [];
  }

  return toolSummaries
    .map((summary) => {
      if (!summary || typeof summary !== "object") return null;
      const name = (summary as Record<string, unknown>).name;
      return typeof name === "string" && name.trim() ? name.trim() : null;
    })
    .filter((name): name is string => Boolean(name))
    .slice(0, 4);
}

function commandPrompt(input: DecisionEngineInput) {
  return input.effectivePrompt?.trim() || input.commandInput?.trim() || input.message.trim();
}

function hasConversationalGreeting(message: string) {
  const trimmed = message.trim();
  return /^(hey|hi|hello|yo|sup|what'?s up|wassup|namaste)\b[!.?\s]*$/i.test(trimmed)
    || /^(hey|hi|hello|yo)\b.*\b(what'?s up|how'?s it going|how (are|ya|you|u)( doing| doin| going)?|how ya doin|how you doing|what'?s good)\b[!.?\s]*$/i.test(trimmed);
}

function fallbackForCommand(input: DecisionEngineInput): AgentDecision | null {
  const prompt = commandPrompt(input);

  if (input.commandHint === "script") {
    if (!prompt) {
      return {
        type: "ask_question",
        questions: ["What should the script be about, and who is it for?"],
        reason: "The /script command needs a concrete topic before the runtime can draft it.",
        expectedFieldTargets: ["topic", "audience"],
      };
    }

    return {
      type: "workflow_call",
      workflowName: "create_script_package",
      input: { prompt },
      reason: "The /script command maps directly to the runtime-v4 script workflow.",
    };
  }

  if (input.commandHint === "storyboard") {
    return {
      type: "workflow_call",
      workflowName: "create_shoot_pack",
      input: { prompt },
      reason: "The /storyboard command maps to the runtime-v4 shoot-pack workflow.",
    };
  }

  if (input.commandHint === "instagram" || input.commandHint === "export") {
    return {
      type: "workflow_call",
      workflowName: "prepare_publish_package",
      input: { prompt: prompt || input.snapshot.project.title, platform: input.snapshot.project.platform },
      reason: `The /${input.commandHint} command maps to the runtime-v4 publish-prep workflow.`,
    };
  }

  if (
    input.commandHint === "form-json-prompt"
    || input.commandHint === "generate"
    || input.commandHint === "generate-image"
    || input.commandHint === "generate-video"
    || input.commandHint === "generate-audio"
  ) {
    return {
      type: "workflow_call",
      workflowName: "create_asset_prompt_pack",
      input: { prompt: prompt || input.snapshot.project.title },
      reason: `The /${input.commandHint} command maps to the runtime-v4 asset prompt workflow.`,
    };
  }

  if (input.commandHint === "analyze") {
    return {
      type: "workflow_call",
      workflowName: "review_content",
      input: {
        target: "script",
        content: prompt || input.snapshot.scriptLab.script || input.snapshot.project.title,
      },
      reason: "The /analyze command maps to the runtime-v4 review workflow.",
    };
  }

  return null;
}

function fallbackForGeneralChat(input: DecisionEngineInput): AgentDecision | null {
  const message = input.message.trim();
  const lower = message.toLowerCase();

  if (hasConversationalGreeting(message)) {
    return {
      type: "final_response",
      response: "Hey, I'm here. Tell me what you're shaping and I can think with you or turn it into a SceneBook output when you're ready.",
      confidence: 0.65,
    };
  }

  if (/^who are you\??$/.test(lower)) {
    return {
      type: "final_response",
      response: "I'm SceneBook's runtime-v4 agent. I can plan reels, draft scripts, prepare shoot packs, review content, and stage workspace changes without writing blindly.",
      confidence: 0.5,
    };
  }

  if (/do you have access to tools/.test(lower)) {
    const toolNames = summarizedToolNames(input.toolSummaries);
    return {
      type: "final_response",
      response: toolNames.length > 0
        ? `Yes. I can use SceneBook runtime tools such as ${toolNames.join(", ")} and the registered v4 creative workflows when the request fits them.`
        : "Yes. I can use SceneBook runtime tools and registered v4 creative workflows when the request fits them.",
      confidence: 0.5,
    };
  }

  return null;
}

function transparentModelDecisionFailure(input: DecisionEngineInput): AgentDecision {
  const prompt = commandPrompt(input);
  const planningContext = input.intentHint === "plan" ? " planning" : "";

  return {
    type: "final_response",
    response: [
      `I'm having trouble generating a reliable${planningContext} answer right now, so I won't fake it with canned output.`,
      prompt ? `The clean prompt I would use next is: "${prompt}".` : "Send the brief again and I can retry from the clean prompt.",
    ].join(" "),
    confidence: 0.3,
  };
}

export function createGracefulDecisionFallback(input: DecisionEngineInput): AgentDecision {
  return createDeterministicSafetyDecision(input)
    ?? fallbackForCommand(input)
    ?? fallbackForGeneralChat(input)
    ?? transparentModelDecisionFailure(input);
}

export function createDeterministicSafetyDecision(input: DecisionEngineInput): AgentDecision | null {
  const latestObservation = input.previousObservations?.at(-1);

  if (latestObservation?.status === "awaiting_approval") {
    return {
      type: "ask_question",
      questions: ["Do you want me to proceed with the requested workspace change?"],
      reason: "A previous tool requires approval before the agent can safely continue.",
      expectedFieldTargets: ["approval"],
    };
  }

  if (
    latestObservation?.status === "blocked" &&
    latestObservation.output?.kind === "creative_workflow_needs_input" &&
    Array.isArray(latestObservation.output.questions)
  ) {
    return {
      type: "ask_question",
      questions: latestObservation.output.questions.filter((question): question is string => typeof question === "string").slice(0, 3),
      reason: latestObservation.message,
      expectedFieldTargets: ["creativeContext"],
    };
  }

  if (latestObservation?.status === "blocked" || latestObservation?.status === "failed") {
    return {
      type: "ask_question",
      questions: ["Do you want me to try a different approach?"],
      reason: latestObservation.message,
      expectedFieldTargets: ["nextAction"],
    };
  }

  return null;
}
