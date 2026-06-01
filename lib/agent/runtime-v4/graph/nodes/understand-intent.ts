import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

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

export function understandIntentNode(state: SceneBookGraphState): SceneBookGraphUpdate {
  const goal = state.goal.trim();
  const format = requestedFormat(goal, state.projectMind?.project.format);
  const topic = topicFromGoal(goal) ?? state.projectMind?.project.title ?? null;
  const summary = [
    "The user wants help shaping",
    format ? `a ${format}` : "a short-form content asset",
    topic ? `about ${topic}` : "for the current project",
    "without applying workspace changes.",
  ].join(" ");

  const intent = {
    summary,
    requestedFormat: format,
    topic,
    confidence: goal.length > 0 ? 0.82 : 0.2,
    needsWorkspaceMutation: false,
  };

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
          requestedFormat: format,
          topic,
          needsWorkspaceMutation: false,
        },
      },
    ],
  };
}
