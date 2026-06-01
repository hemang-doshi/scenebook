import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

function fallbackTopic(state: SceneBookGraphState) {
  return state.currentIntent?.topic ?? state.intent?.topic ?? state.projectMind?.project.title ?? "this project";
}

export function buildNoWritePlan(state: SceneBookGraphState) {
  const format = state.currentIntent?.requestedFormat
    ?? state.intent?.requestedFormat
    ?? state.projectMind?.project.format
    ?? "short-form video";
  const topic = fallbackTopic(state);
  const platform = state.projectMind?.project.platform ?? "the target platform";
  return {
    title: `Plan a ${format} about ${topic}`,
    steps: [
      {
        label: `Anchor the ${format} in one specific ${topic} moment.`,
        sideEffect: "none" as const,
        requiresApproval: false,
      },
      {
        label: "Draft a hook, three-beat outline, and payoff before writing the full script.",
        sideEffect: "none" as const,
        requiresApproval: false,
      },
      {
        label: `Map A-roll, B-roll, and screen captures that make the ${platform} story visible.`,
        sideEffect: "none" as const,
        requiresApproval: false,
      },
      {
        label: "Prepare caption, CTA, and edit notes for a later SceneBook workspace patch.",
        sideEffect: "none" as const,
        requiresApproval: false,
      },
    ],
  };
}

export function proposePlanNode(state: SceneBookGraphState): SceneBookGraphUpdate {
  const plan = buildNoWritePlan(state);

  return {
    plan,
    currentDecision: {
      type: "propose_plan",
      plan,
      reason: "The request is a no-write creative planning task.",
    },
    events: [
      {
        type: "decision_made",
        runId: state.runId,
        threadId: state.threadId ?? null,
        decision: {
          type: "propose_plan",
          plan,
          reason: "The request is a no-write creative planning task.",
        },
      },
    ],
    observations: [
      {
        type: "plan_proposed",
        message: `Proposed ${plan.steps.length} no-write planning steps.`,
        data: {
          title: plan.title,
          stepCount: plan.steps.length,
        },
      },
    ],
  };
}
