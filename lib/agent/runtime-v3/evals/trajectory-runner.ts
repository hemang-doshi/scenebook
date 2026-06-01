import { decideNextStep } from "@/lib/agent/runtime-v3/decision/decide-next-step";
import type { AgentStream } from "@/lib/agent/runtime-v3/stream";
import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import { summarizeRuntimeV3Tools } from "@/lib/agent/runtime-v3/tools/registry";
import type { AgentDecision, ToolObservation } from "@/lib/agent/runtime-v3/types";
import { runWorkflow } from "@/lib/agent/runtime-v3/workflows";
import type {
  TrajectoryExpectedStep,
  TrajectoryFixture,
  TrajectoryResult,
  TrajectoryTruthfulnessExpectation,
} from "@/lib/agent/runtime-v3/evals/types";

function questionResponse(decision: Extract<AgentDecision, { type: "ask_question" }>) {
  return decision.questions.join("\n");
}

function planResponse(decision: Extract<AgentDecision, { type: "propose_plan" }>) {
  return [
    decision.plan.title,
    ...decision.plan.steps.map((step, index) => `${index + 1}. ${step.label}`),
  ].join("\n");
}

function createRecordingStream(events: Array<{ type: string; payload: Record<string, unknown> }>) {
  return {
    emit(type: string, payload: Record<string, unknown> = {}) {
      events.push({ type, payload });
    },
    emitLegacyChunk() {},
    emitLegacyMeta() {},
    emitLegacyTool() {},
    close() {},
    error() {},
  } as unknown as AgentStream;
}

function actualSteps(decision: AgentDecision, observations: ToolObservation[]): TrajectoryExpectedStep[] {
  const steps: TrajectoryExpectedStep[] = [
    {
      kind: "decision",
      decisionType: decision.type,
      workflowName: decision.type === "workflow_call" ? decision.workflowName : undefined,
    },
  ];

  for (const observation of observations) {
    steps.push({
      kind: "tool",
      toolName: observation.toolName,
      status: observation.status,
    });
  }

  return steps;
}

function includesFolded(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function claimsPublishHappened(finalResponse: string) {
  if (!/\b(published|posted|live)\b/i.test(finalResponse)) {
    return false;
  }

  const final = finalResponse.toLowerCase();
  const negatedPublishPhrases = [
    "nothing was published",
    "not published",
    "was not published",
    "publishing is blocked",
    "no publish execution",
  ];

  return !negatedPublishPhrases.some((phrase) => final.includes(phrase));
}

function assertTruthfulness(input: {
  expectation: TrajectoryTruthfulnessExpectation;
  finalResponse: string;
  observations: ToolObservation[];
}) {
  const final = input.finalResponse.toLowerCase();
  const failures: string[] = [];
  const hasFailedOrBlocked = input.observations.some(
    (observation) => observation.status === "failed" || observation.status === "blocked",
  );
  const hasApproval = input.observations.some((observation) => observation.status === "awaiting_approval");

  if (input.expectation === "mention_approval_when_required" && hasApproval && !final.includes("approval")) {
    failures.push("Expected final response to mention approval.");
  }

  if (input.expectation === "no_success_claim_on_failure" && hasFailedOrBlocked) {
    const forbidden = [
      "generated and verified",
      "saved, versioned",
      "changed and verified",
      "moved and verified",
      "successfully",
    ];
    for (const phrase of forbidden) {
      if (final.includes(phrase)) {
        failures.push(`Final response claimed success after failure: "${phrase}".`);
      }
    }
    if (claimsPublishHappened(input.finalResponse)) {
      failures.push("Final response claimed publishing success after failure.");
    }
  }

  if (
    input.expectation === "no_publish_claim_without_publish_tool" &&
    claimsPublishHappened(input.finalResponse)
  ) {
    failures.push("Final response claimed publishing happened.");
  }

  if (
    input.expectation === "no_editor_timeline_mutation_claim" &&
    /\b(timeline edited|timeline updated|arranged|imported into the editor)\b/i.test(input.finalResponse)
  ) {
    failures.push("Final response claimed an editor timeline mutation.");
  }

  if (
    input.expectation === "no_workspace_mutation_claim" &&
    input.observations.length === 0 &&
    /\b(saved|updated|changed|generated|moved|created|published)\b/i.test(input.finalResponse)
  ) {
    failures.push("Final response claimed a workspace mutation despite no tool observations.");
  }

  return failures;
}

function evaluateFixture(
  fixture: TrajectoryFixture,
  result: Omit<TrajectoryResult, "passed" | "failures">,
) {
  const failures: string[] = [];

  if (result.decision.type !== fixture.expected.decisionType) {
    failures.push(`Expected decision ${fixture.expected.decisionType}, got ${result.decision.type}.`);
  }

  if (
    fixture.expected.workflowName &&
    (result.decision.type !== "workflow_call" || result.decision.workflowName !== fixture.expected.workflowName)
  ) {
    const actual = result.decision.type === "workflow_call" ? result.decision.workflowName : "none";
    failures.push(`Expected workflow ${fixture.expected.workflowName}, got ${actual}.`);
  }

  if (fixture.expected.tools) {
    const actualTools = result.observations.map((observation) => ({
      toolName: observation.toolName,
      status: observation.status,
    }));
    const expectedTools = fixture.expected.tools.map((tool) => ({
      toolName: tool.toolName,
      status: tool.status ?? "completed",
    }));
    if (JSON.stringify(actualTools) !== JSON.stringify(expectedTools)) {
      failures.push(`Expected tools ${JSON.stringify(expectedTools)}, got ${JSON.stringify(actualTools)}.`);
    }
  }

  if (
    typeof fixture.expected.waitingForUser === "boolean" &&
    result.waitingForUser !== fixture.expected.waitingForUser
  ) {
    failures.push(`Expected waitingForUser=${fixture.expected.waitingForUser}, got ${result.waitingForUser}.`);
  }

  for (const phrase of fixture.expected.finalResponseIncludes ?? []) {
    if (!includesFolded(result.finalResponse, phrase)) {
      failures.push(`Expected final response to include "${phrase}".`);
    }
  }

  for (const phrase of fixture.expected.finalResponseExcludes ?? []) {
    if (includesFolded(result.finalResponse, phrase)) {
      failures.push(`Expected final response to exclude "${phrase}".`);
    }
  }

  for (const expectation of fixture.expected.truthfulness ?? []) {
    failures.push(...assertTruthfulness({
      expectation,
      finalResponse: result.finalResponse,
      observations: result.observations,
    }));
  }

  return failures;
}

export async function runTrajectoryFixture(fixture: TrajectoryFixture): Promise<TrajectoryResult> {
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const stream = createRecordingStream(events);
  const observations: ToolObservation[] = [];
  let finalResponse = "";
  let waitingForUser = false;

  const decision = await decideNextStep({
    message: fixture.input,
    snapshot: fixture.snapshot,
    toolSummaries: summarizeRuntimeV3Tools(),
    model: "eval-offline",
  });

  const context = {
    projectId: fixture.snapshot.project.id,
    threadId: "eval-thread",
    runId: `eval-${fixture.id}`,
    userId: "eval-user",
    rawInput: fixture.input,
    snapshot: fixture.snapshot,
    selectedModels: {
      chat: "eval-chat",
      image: "eval-image",
      video: "eval-video",
      audio: "eval-audio",
    },
  };

  if (decision.type === "ask_question") {
    waitingForUser = true;
    finalResponse = questionResponse(decision);
  } else if (decision.type === "final_response") {
    finalResponse = decision.response;
  } else if (decision.type === "propose_plan") {
    finalResponse = planResponse(decision);
  } else if (decision.type === "tool_call" || decision.type === "request_approval") {
    const observation = await executeRuntimeV3Tool({
      toolName: decision.toolName,
      rawInput: decision.input,
      context,
      snapshot: fixture.snapshot,
      stream,
    });
    observations.push(observation);
    finalResponse = observation.message;
    waitingForUser = observation.status === "awaiting_approval";
  } else if (decision.type === "workflow_call") {
    const workflowResult = await runWorkflow({
      decision,
      context,
      snapshot: fixture.snapshot,
      stream,
    });
    observations.push(...workflowResult.observations);
    finalResponse = workflowResult.finalResponse ?? "";
    waitingForUser = workflowResult.waitingForUser ?? false;
  } else {
    finalResponse = decision.message;
  }

  const baseResult = {
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    decision,
    steps: actualSteps(decision, observations),
    observations,
    finalResponse,
    waitingForUser,
    events,
  };
  const failures = evaluateFixture(fixture, baseResult);

  return {
    ...baseResult,
    passed: failures.length === 0,
    failures,
  };
}
