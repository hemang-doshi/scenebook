import type { ModelGateway } from "@/lib/ai/model-gateway";
import { generateIntentUnderstanding } from "@/lib/agent/runtime-v4/model";
import type {
  SceneBookGraphIntent,
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export type UnderstandIntentNodeOptions = {
  model?: string;
  modelGateway?: ModelGateway;
};

function requestedFormat(goal: string, fallback?: string) {
  if (/\breel\b/i.test(goal)) return "reel";
  if (/\bshort\b/i.test(goal)) return "short";
  if (/\bcarousel\b/i.test(goal)) return "carousel";
  if (/\bscript\b/i.test(goal)) return "script";
  return fallback ?? null;
}

function topicFromGoal(goal: string) {
  const aboutMatch = goal.match(/\babout\s+(.+?)\s*$/i);
  if (aboutMatch?.[1]) {
    return aboutMatch[1].replace(/[.!?]+$/u, "").trim();
  }

  const forMatch = goal.match(/\bfor\s+(.+?)\s*$/i);
  if (forMatch?.[1]) {
    return forMatch[1].replace(/[.!?]+$/u, "").trim();
  }

  return null;
}

function effectiveGoal(state: SceneBookGraphState) {
  return state.effectivePrompt?.trim() || state.goal.trim();
}

function isConversationalGreeting(goal: string) {
  const trimmed = goal.trim();
  return /^(hey|hi|hello|yo|sup|what'?s up|wassup|namaste)\b[!.?\s]*$/i.test(trimmed)
    || /^(hey|hi|hello|yo)\b.*\b(what'?s up|how'?s it going|how (are|ya|you|u)( doing| doin| going)?|how ya doin|how you doing|what'?s good)\b[!.?\s]*$/i.test(trimmed);
}

function hasCreativeSignal(goal: string) {
  return /\b(reel|short|video|script|shoot pack|shot list|storyboard|b-roll|broll|caption|hook|production package)\b/i.test(goal);
}

function deterministicIntent(state: SceneBookGraphState): SceneBookGraphIntent {
  const goal = effectiveGoal(state);
  const format = requestedFormat(goal, state.projectMind?.project.format);
  const topic = topicFromGoal(goal) ?? state.projectMind?.project.title ?? null;

  if (!goal || isConversationalGreeting(goal) || !hasCreativeSignal(goal)) {
    return {
      intentType: "general_chat",
      summary: goal
        ? "The user wants a conversational SceneBook response."
        : "The user has not provided enough input yet.",
      requestedFormat: null,
      topic: null,
      confidence: goal ? 0.55 : 0.2,
      creativeMode: undefined,
      needsClarification: false,
      inferredGoal: goal || undefined,
      needsWorkspaceMutation: false,
    };
  }

  const summary = [
    "The user wants help shaping",
    format ? `a ${format}` : "a short-form content asset",
    topic ? `about ${topic}` : "for the current project",
    "without applying workspace changes.",
  ].join(" ");

  return {
    intentType: format === "script" ? "revise_script" : "create_reel",
    summary,
    requestedFormat: format,
    topic,
    confidence: goal.length > 0 ? 0.82 : 0.2,
    creativeMode: "plan",
    needsClarification: false,
    inferredGoal: goal || undefined,
    needsWorkspaceMutation: false,
  };
}

function summaryFor(intent: SceneBookGraphIntent) {
  return intent.summary
    || intent.inferredGoal
    || "The user wants SceneBook help with the current project.";
}

export function createUnderstandIntentNode(options: UnderstandIntentNodeOptions = {}) {
  return async function understandIntentNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    let intent = deterministicIntent(state);

    try {
      const result = await generateIntentUnderstanding({
        goal: state.goal,
        effectiveGoal: effectiveGoal(state),
        projectTitle: state.projectMind?.project.title,
        projectFormat: state.projectMind?.project.format,
        model: options.model,
        modelGateway: options.modelGateway,
      });
      const understood = result.object;
      intent = {
        intentType: understood.intentType,
        summary: understood.summary
          ?? understood.inferredGoal
          ?? intent.summary,
        requestedFormat: understood.requestedFormat ?? intent.requestedFormat,
        topic: understood.topic ?? intent.topic,
        confidence: understood.confidence,
        creativeMode: understood.creativeMode,
        needsClarification: understood.needsClarification,
        clarificationQuestion: understood.clarificationQuestion,
        inferredGoal: understood.inferredGoal,
        needsWorkspaceMutation: understood.needsWorkspaceMutation ?? intent.needsWorkspaceMutation,
      };
    } catch {
      intent = deterministicIntent(state);
    }

    const summary = summaryFor(intent);

    return {
      currentIntent: intent,
      intent,
      events: [
        {
          type: "agent_thinking",
          runId: state.runId,
          threadId: state.threadId ?? null,
          message: summary,
        },
      ],
      observations: [
        {
          type: "intent_understood",
          message: summary,
          data: {
            intentType: intent.intentType ?? "general_chat",
            requestedFormat: intent.requestedFormat,
            topic: intent.topic,
            needsWorkspaceMutation: intent.needsWorkspaceMutation,
          },
        },
      ],
    };
  };
}

export const understandIntentNode = createUnderstandIntentNode();
