# System Architecture Spec — SceneBook Agent Harness Runtime

## 1. Architecture Goal

Build a real agent harness that separates:
- HTTP transport,
- project context loading,
- decisioning,
- policy,
- tool execution,
- memory,
- workflow state,
- streaming,
- evaluation.

The system should be boring, explicit, inspectable, and extensible.

## 2. Target Module Layout

```txt
lib/agent/runtime-v3/
  kernel.ts
  types.ts
  stream.ts
  decision/
    decide-next-step.ts
    schemas.ts
    prompts.ts
    repair.ts
  context/
    project-snapshot.ts
    compact-snapshot.ts
    memory-loader.ts
  policy/
    policy-engine.ts
    risk.ts
  tools/
    registry.ts
    executor.ts
    types.ts
  workflows/
    script-workflow.ts
    asset-workflow.ts
    workspace-control-workflow.ts
    goal-workflow.ts
    editor-handoff-workflow.ts
    publish-workflow.ts
  memory/
    creative-brief-store.ts
    goal-store.ts
    run-summary-store.ts
    script-version-store.ts
  response/
    final-response.ts
    tool-observation.ts
  evals/
    trajectory-runner.ts
```

Existing runtime-v2 modules can be migrated gradually or wrapped.

## 3. Thin Route

Path:

```txt
app/api/projects/[id]/agent/route.ts
```

Responsibilities:
- authenticate,
- parse request,
- create/load thread,
- create run,
- call `AgentKernel.run()`,
- return SSE response,
- handle top-level error.

It must not contain workflow branches, implement tools, call specific tools directly, or decide project stage.

## 4. Core Runtime Types

### AgentRunRequest

```ts
type AgentRunRequest = {
  projectId: string;
  threadId?: string;
  userId: string;
  message: string;
  attachments?: AgentAttachment[];
  selectedModels?: Record<string, string>;
};
```

### ProjectSnapshot

```ts
type ProjectSnapshot = {
  project: {
    id: string;
    title: string;
    platform: string;
    format: string;
    status: string;
  };
  creativeBrief: CreativeBriefState | null;
  activeGoal: AgentGoalState | null;
  scriptLab: ScriptLabState;
  scriptVersions: ScriptVersionSummary[];
  shootPack: ShootPackState;
  assets: AssetLibrarySummary;
  editor: EditorStateSummary;
  publish: PublishPackageSummary | null;
  analytics: AnalyticsSummary | null;
  conversation: ConversationSummary;
  toolHistory: ToolCallSummary[];
  readiness: ProjectReadiness;
};
```

### AgentDecision

```ts
type AgentDecision =
  | {
      type: "final_response";
      response: string;
      confidence: number;
    }
  | {
      type: "ask_question";
      questions: string[];
      reason: string;
      expectedFieldTargets?: string[];
    }
  | {
      type: "propose_plan";
      plan: AgentPlan;
      reason: string;
    }
  | {
      type: "tool_call";
      toolName: string;
      input: unknown;
      reason: string;
    }
  | {
      type: "workflow_call";
      workflowName: string;
      input: unknown;
      reason: string;
    }
  | {
      type: "stop_with_error";
      message: string;
    };
```

### Tool Contract

```ts
type AgentTool<TInput, TOutput> = {
  name: string;
  displayName: string;
  description: string;
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  sideEffect: "none" | "db_write" | "asset_generation" | "editor_write" | "publish";
  approvalPolicy: "auto" | "ask_if_overwrite" | "always";
  availability: ToolAvailability;
  handler: (ctx: ToolContext, input: TInput) => Promise<ToolResult<TOutput>>;
  verify?: (ctx: ToolContext, result: ToolResult<TOutput>) => Promise<VerificationResult>;
};
```

## 5. Agent Kernel

Pseudo-flow:

```ts
async function run(request: AgentRunRequest, stream: AgentStream) {
  const run = await createRun(request);

  for (let step = 0; step < maxSteps; step++) {
    const snapshot = await buildProjectSnapshot(request.projectId, request.threadId);

    await stream.emit("snapshot_loaded", compactSnapshot(snapshot));

    const decision = await decideNextStep({
      request,
      snapshot,
      tools: getAvailableTools(snapshot),
      previousObservations,
    });

    await recordDecision(run.id, decision);
    await stream.emit("decision", sanitizeDecision(decision));

    if (decision.type === "final_response") {
      await completeRun(run.id, decision.response);
      await stream.emit("message_delta", decision.response);
      await stream.emit("run_completed", {});
      return;
    }

    if (decision.type === "ask_question") {
      const response = formatQuestions(decision);
      await completeRun(run.id, response);
      await stream.emit("message_delta", response);
      await stream.emit("run_completed", { waitingForUser: true });
      return;
    }

    if (decision.type === "propose_plan") {
      await stream.emit("plan", decision.plan);
      const response = formatPlan(decision.plan);
      await completeRun(run.id, response);
      await stream.emit("message_delta", response);
      await stream.emit("run_completed", {});
      return;
    }

    if (decision.type === "tool_call") {
      const policy = await checkPolicy(decision, snapshot);

      if (policy.requiresApproval) {
        await createPendingApproval(decision, policy);
        await stream.emit("approval_required", policy);
        await completeRun(run.id, "Approval required.");
        return;
      }

      const observation = await executeTool(decision, stream);
      previousObservations.push(observation);
      continue;
    }

    if (decision.type === "workflow_call") {
      const observation = await runWorkflow(decision, stream);
      previousObservations.push(observation);
      continue;
    }
  }

  await failOrCompleteWithStepLimit();
}
```

## 6. Context Builder

The context builder should output two forms.

### Full Snapshot

Used internally and stored for traces.

### Compact LLM Context

Used for the decision model.

Example compact context:

```txt
PROJECT
Title: Building SceneBook launch reel
Platform: Instagram
Format: Reel
Status: scripted

BRIEF
Audience: young builders and tech creators
Core angle: building the tool I needed myself
Tone: raw, polished, devlog
Open questions: none

SCRIPT
Current hook: "I got tired of losing content ideas..."
Script status: usable but needs stronger visual beats

ASSETS
3 assets present
Missing: thumbnail, screen recording, intro b-roll

GOAL
Take project from idea to publish
Stage: asset_planning
Next action: generate thumbnail and screen recording shot list
```

## 7. Policy Engine

Policy output:

```ts
type PolicyResult = {
  allowed: boolean;
  requiresApproval: boolean;
  risk: "low" | "medium" | "high" | "blocked";
  reason: string;
};
```

Approval triggers:
- publishing,
- destructive editor actions,
- deletion,
- overwrite finalized script,
- replace active asset,
- paid/expensive generation if configured,
- unavailable/stubbed tool,
- external API side effects.

## 8. Tool Executor

Executor responsibilities:
1. Load tool.
2. Validate availability.
3. Validate input schema.
4. Create tool-call record.
5. Emit `tool_planned`.
6. Emit `tool_running`.
7. Execute handler.
8. Validate output schema.
9. Verify persistence if mutating.
10. Complete or fail tool-call record.
11. Emit final tool event.
12. Return observation to kernel.

## 9. Workflows

Workflows are optional higher-level domain procedures. They should use the same executor, never direct tool handlers.

### Script Workflow

State-aware:
- if no brief, ask/update brief,
- if no script, generate,
- if existing script and improve requested, critique/rewrite,
- if save requested, patch Script Lab,
- if finalized, require approval for overwrite,
- create version artifact.

### Asset Workflow

State-aware:
- infer modality,
- ask if prompt vague,
- generate prompt JSON,
- create/reuse folder,
- generate asset,
- verify asset,
- attach/confirm association,
- update goal.

### Workspace Control Workflow

Small direct actions:
- save hook,
- save CTA,
- add tasks,
- create folder,
- move asset,
- prepare publish package.

### Editor Handoff Workflow

Until editor writes are implemented:
- create structured editor handoff artifact,
- list assets to import,
- sequence shots,
- recommend timeline flow.

## 10. Memory

Memory layers:
- conversation memory,
- project creative brief,
- active goal,
- script versions,
- run summaries,
- decisions/rejections,
- analytics learnings.

Memory must be inspectable and editable later.

## 11. Streaming Events

Use consistent event names:

```txt
run_started
snapshot_loaded
decision
plan
tool_planned
tool_running
tool_completed
tool_failed
approval_required
goal_updated
message_delta
run_completed
run_failed
```

## 12. Evaluation

Use trajectory tests:

```ts
{
  input: "make this my hook: I wasted 6 months planning content",
  expected: {
    decisionType: "tool_call",
    toolName: "update_script_lab",
    inputSubset: { hook: "I wasted 6 months planning content" },
    forbiddenTools: ["update_project_status", "publish_to_instagram"]
  }
}
```

## 13. Migration Strategy

1. Keep runtime-v2 stable.
2. Build runtime-v3 in parallel.
3. Wrap existing tools into new tool contract.
4. Move route to runtime-v3 under feature flag.
5. Run trajectory tests.
6. Gradually remove old route logic.
