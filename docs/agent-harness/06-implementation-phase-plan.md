# Implementation Phase Plan — SceneBook Agent Harness Runtime

## Branch Strategy

Recommended new implementation branch:

```txt
codex/agent-harness-runtime
```

Docs/spec branch:

```txt
codex/agent-harness-runtime-specs
```

Implementation should start from a fresh clone/branch and proceed in small phases.

Each phase must:
1. implement only that phase scope,
2. run tests/typecheck/build where practical,
3. commit,
4. push to the working branch.

## Phase 0 — Stabilize And Audit Existing Runtime

### Goal

Identify and fix correctness issues before building runtime-v3.

### Tasks

- Review current agent route.
- Confirm runtime-v2 feature flag behavior.
- Fix approval execution to use exact stored `toolName` + `input`.
- Prevent pending runtime-v2 tool calls from defaulting to command `script`.
- Mark stubbed editor/publish tools as unavailable.
- Ensure asset attachment tool does not fake persistence.
- Add tests for approval correctness and no false success claims.

### Deliverables

- Fixed approval flow.
- Tool availability metadata.
- Tests proving approval executes exact tool.

### Codex Prompt

```txt
You are working in the SceneBook repo on branch codex/agent-harness-runtime.

Phase 0 goal: stabilize current agent runtime correctness before runtime-v3 extraction.

Tasks:
1. Inspect app/api/projects/[id]/agent/route.ts and current runtime-v2 tools.
2. Fix approval execution so applying a pending approval loads the exact runtime tool by stored tool name and executes its stored input through the same validation/policy path.
3. Remove any behavior where runtime-v2 pending tool calls default to command "script" when command is null.
4. Add tool availability metadata for stubbed editor and Instagram publish tools.
5. Ensure unavailable/stubbed tools cannot be executed and return a clear blocked response.
6. Ensure attach_asset_to_project either performs a real persistence verification or is renamed/adjusted to accurately report that the asset is already linked.
7. Add or update unit tests for approval apply, reject, ask-for-changes, unavailable tool, and no false workspace claim.

Do not redesign the full runtime yet. Keep changes focused. Run lint/typecheck/tests if available. Commit and push when complete.
```

## Phase 1 — Runtime v3 Skeleton

### Goal

Extract a proper agent harness structure without changing all behavior yet.

### Tasks

Create:

```txt
lib/agent/runtime-v3/kernel.ts
lib/agent/runtime-v3/types.ts
lib/agent/runtime-v3/stream.ts
lib/agent/runtime-v3/tools/executor.ts
lib/agent/runtime-v3/tools/registry.ts
lib/agent/runtime-v3/policy/policy-engine.ts
lib/agent/runtime-v3/context/project-snapshot.ts
```

The route should call the new kernel behind:

```txt
AGENT_HARNESS_RUNTIME_ENABLED=true
```

### Deliverables

- Thin route path for runtime-v3.
- Kernel can accept request and return a final chat response.
- Basic stream events work.

### Codex Prompt

```txt
Phase 1 goal: create the runtime-v3 harness skeleton behind AGENT_HARNESS_RUNTIME_ENABLED.

Implement a thin AgentKernel with typed request/run/event types. Do not migrate all workflows yet.

Requirements:
1. Add lib/agent/runtime-v3 module layout.
2. Add AgentRunRequest, AgentRunContext, ProjectSnapshot, AgentDecision, AgentEvent, ToolObservation types.
3. Add AgentStream helper for SSE event emission.
4. Add a basic ProjectSnapshot builder that loads current project, recent messages, recent tool calls, and active goal if available.
5. Add a stub decision path that returns a safe final response using the snapshot.
6. Update app/api/projects/[id]/agent/route.ts so when AGENT_HARNESS_RUNTIME_ENABLED=true it calls runtime-v3; otherwise existing runtime remains.
7. Keep route thin; no workflow logic in route.
8. Add tests for kernel initialization and thin-route behavior where feasible.

Commit and push after tests.
```

## Phase 2 — Central Tool Registry And Executor

### Goal

Move all tool execution through one runtime-v3 executor.

### Tasks

- Wrap existing runtime-v2 tools or migrate them into runtime-v3 tool contract.
- Add availability state.
- Add output validation.
- Add verification hooks.
- Add consistent tool events.

### Deliverables

- One executor path for all tools.
- Tests for successful, failed, blocked, and approval-required tool calls.

### Codex Prompt

```txt
Phase 2 goal: implement central runtime-v3 tool registry and executor.

Requirements:
1. Define AgentTool contract with inputSchema, outputSchema, sideEffect, approvalPolicy, availability, handler, optional verify.
2. Register/migrate existing script, workspace, asset, editor, and Instagram tools.
3. Mark editor write and Instagram publish as unavailable/stubbed until real integrations exist.
4. Implement executeTool() that validates input, creates tool call record, emits planned/running/completed/failed events, executes handler, validates output, verifies mutation, and returns ToolObservation.
5. Ensure all tool execution uses the same owner/project/run/thread context.
6. Add tests for:
   - valid tool execution,
   - schema validation failure,
   - unavailable tool blocked,
   - handler failure,
   - verified mutation success.

Do not implement LLM decisioning yet. Commit and push.
```

## Phase 3 — Project Snapshot And Creative Brief Canonicalization

### Goal

Make project state first-class.

### Tasks

- Build full `ProjectSnapshot`.
- Implement creative brief store.
- Stop using Script Lab notes as creative brief storage.
- Add readiness/completeness signals.

### Deliverables

- `project_creative_briefs` CRUD/upsert helpers.
- Snapshot includes brief, goal, script, shoot pack, assets, analytics.
- Tests for snapshot shape.

### Codex Prompt

```txt
Phase 3 goal: build canonical ProjectSnapshot and Creative Brief state.

Requirements:
1. Implement project snapshot builder with project metadata, Script Lab, shoot pack, assets summary, analytics, active goal, recent messages/tool calls, creative brief, and readiness signals.
2. Implement creative brief store using project_creative_briefs as source of truth.
3. Update creative brief tool to upsert structured brief fields into project_creative_briefs, not Script Lab notes.
4. Track open questions and resolved fields.
5. Add compactSnapshotForModel() that creates a concise model-safe context.
6. Add tests for snapshot loading, compacting, creative brief upsert, and open-question behavior.

Commit and push.
```

## Phase 4 — Structured Decision Engine

### Goal

Replace regex-as-brain with model-driven structured decisioning.

### Tasks

- Add `decideNextStep`.
- Use schema-validated model output.
- Include project snapshot and tool list.
- Keep deterministic hints as fallback.

### Deliverables

- Model can choose final/ask/plan/tool/workflow.
- Invalid decisions repair once.
- Tests with mocked model outputs.

### Codex Prompt

```txt
Phase 4 goal: add structured AgentDecision engine.

Requirements:
1. Define AgentDecision schema with final_response, ask_question, propose_plan, tool_call, workflow_call, stop_with_error.
2. Build decideNextStep() that receives user message, compact project snapshot, active goal, recent observations, and available tool summaries.
3. Use a structured model output path. If current AI client lacks strict structured output, implement JSON extraction + schema validation + one repair attempt.
4. Keep regex/command parsing only as hints, not final authority.
5. Add guardrails: unknown tools blocked, invalid input blocked, unavailable tools blocked.
6. Add mocked tests for:
   - ask question,
   - save hook tool call,
   - script workflow call,
   - asset workflow call,
   - final brainstorm response,
   - invalid JSON repair.

Commit and push.
```

## Phase 5 — Policy And Approval Engine

### Goal

Make risk/approval rules central and production-safe.

### Tasks

- Implement `checkPolicy`.
- Add approval request records.
- Implement approval resume through executor.
- Add before/after patch previews where possible.

### Deliverables

- Approval cannot bypass policy.
- Publish/destructive/overwrite actions require approval.
- Request changes resumes correctly.

### Codex Prompt

```txt
Phase 5 goal: centralize policy and approval.

Requirements:
1. Implement policy engine returning allowed, requiresApproval, risk, reason, and optional preview.
2. Approval triggers: publish, delete, destructive editor write, overwrite finalized script, unavailable integration, expensive generation if configured.
3. When approval required, create pending tool call with exact tool name and validated input, emit approval_required, and stop run.
4. Implement approve/reject/request-changes endpoints or handlers using runtime-v3 executor.
5. Approval execution must re-check policy before running.
6. Add before/after preview for Script Lab patches and status changes.
7. Add tests for overwrite script approval, publish approval, reject, request changes, and policy re-check.

Commit and push.
```

## Phase 6 — Adaptive Workflows

### Goal

Build state-aware workflows using the kernel/executor.

### Workflows

- script workflow,
- asset workflow,
- workspace control workflow,
- goal workflow,
- editor handoff workflow,
- publish preparation workflow.

### Deliverables

- Workflows call executor, not handlers directly.
- Workflows inspect snapshot before deciding.
- Goal updates after meaningful steps.

### Codex Prompt

```txt
Phase 6 goal: implement adaptive workflows on top of runtime-v3.

Requirements:
1. Implement script workflow:
   - inspect creative brief and Script Lab,
   - ask missing high-leverage questions,
   - generate script package,
   - critique,
   - save/version when safe,
   - update goal/stage.
2. Implement asset workflow:
   - infer modality,
   - ask if vague,
   - generate prompt JSON,
   - create/reuse folder,
   - generate asset,
   - verify saved asset,
   - update goal/stage.
3. Implement workspace-control workflow for save hook, CTA, script text, shoot tasks, folder creation, asset move, prepare Instagram package.
4. Implement editor handoff workflow as artifact creation only; no fake timeline mutation.
5. Implement publish preparation workflow with publish blocked unless integration available + approval.
6. Add trajectory tests for each workflow.

Commit and push.
```

## Phase 7 — UI/UX Upgrade

### Goal

Make the harness visible and trustworthy.

### Tasks

- Add Project Mind panel.
- Add PlanCard.
- Improve ToolCallCard.
- Improve ApprovalCard.
- Add GoalCard/readiness.
- Add better error UX.

### Deliverables

- User sees plan, tool events, active goal, readiness, approval states.
- Runtime events update UI in order.

### Codex Prompt

```txt
Phase 7 goal: upgrade agent UI for production harness visibility.

Requirements:
1. Add ProjectMindPanel showing active goal, stage, readiness, brief summary, missing items, and next action.
2. Add PlanCard for proposed/executing/completed plans.
3. Update ToolCallCard to show side effect, approval policy, changed fields, verification, asset preview, and error messages.
4. Update ApprovalCard with risk reason and before/after preview where available.
5. Add GoalCard and ReadinessMeter components.
6. Ensure event stream updates UI in correct order.
7. Responsive behavior: Project Mind collapses into drawer on smaller screens.
8. Add component/unit tests where existing test stack allows.

Commit and push.
```

## Phase 8 — Evals, QA, And Hardening

### Goal

Prove the agent behaves correctly.

### Tasks

- Add trajectory test runner.
- Add eval fixtures.
- Add manual QA checklist.
- Add failure simulations.
- Add docs for runtime.

### Deliverables

- Automated trajectory tests.
- Updated QA docs.
- Runtime docs.
- Green build.

### Codex Prompt

```txt
Phase 8 goal: add evals, QA, and hardening for runtime-v3.

Requirements:
1. Add trajectory test runner for agent decisions/workflows with mocked model/tool responses.
2. Add fixtures for:
   - vague script asks questions,
   - detailed script saves,
   - critique-only does not save,
   - save hook changes only hook,
   - asset generation verifies asset,
   - ambiguous asset move asks question,
   - publish requires approval,
   - editor handoff does not fake timeline edit,
   - failed tool does not claim success.
3. Add runtime-v3 QA checklist.
4. Add developer docs for adding tools/workflows.
5. Run lint, typecheck, tests, and build.
6. Fix issues until green.

Commit and push.
```

## Recommended Merge Gate

Do not merge runtime-v3 until:

- approval flow is correct,
- no false workspace claims in tests,
- route is thin,
- tool executor is central,
- project snapshot is canonical,
- creative brief is canonical,
- trajectory tests pass,
- UI shows tool/approval/goal states clearly.
