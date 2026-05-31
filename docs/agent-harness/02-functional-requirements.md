# Functional Requirements — SceneBook Agent Harness

## 1. Runtime Entry

### FR-001 Thin Agent Route

The API route must authenticate the user, validate the request, create or load an agent thread, create an agent run, call the runtime kernel, stream runtime events to the client, and return errors in a consistent format.

The route must not contain workflow-specific business logic.

### FR-002 Runtime Feature Flag

The new harness must be behind a feature flag:

```txt
AGENT_HARNESS_RUNTIME_ENABLED=true
```

The existing runtime may remain available until the new runtime passes QA.

## 2. Project Snapshot

### FR-010 Load Project Snapshot

Every run must load a `ProjectSnapshot`.

Required snapshot fields:
- project metadata,
- platform,
- format,
- status,
- Script Lab,
- active script version,
- creative brief,
- open questions,
- active goal,
- shoot pack,
- asset library summary,
- editor readiness,
- publish package,
- analytics journal,
- recent messages,
- recent tool calls,
- relevant memory summaries.

### FR-011 Snapshot Must Be Serializable

The snapshot must have a compact JSON representation for LLM decision context, debugging, run traces, and tests.

### FR-012 Snapshot Must Include Completeness Signals

The snapshot must derive:
- `briefCompleteness`,
- `scriptCompleteness`,
- `assetReadiness`,
- `shootReadiness`,
- `editorReadiness`,
- `publishReadiness`,
- `nextLikelyStage`.

## 3. Agent Decision Engine

### FR-020 Structured Agent Decision

The runtime must ask the model for a structured decision when deterministic routing is insufficient.

Decision types:
- `final_response`,
- `ask_question`,
- `propose_plan`,
- `tool_call`,
- `workflow_call`,
- `request_approval`,
- `stop_with_error`.

### FR-021 Decision Schema Validation

Every model decision must be validated with a schema before execution.

Invalid decisions must be repaired once, then fail safely.

### FR-022 Available Tools Context

The decision engine must receive tool names, tool descriptions, input schema summaries, side effects, approval policies, and availability state.

### FR-023 Slash Commands As Hints

Slash commands must influence decisioning but not bypass policy, tool schema validation, state inspection, or approval rules.

## 4. Agent Loop

### FR-030 Loop Execution

The agent kernel must support:

```txt
observe -> decide -> policy-check -> act -> observe -> continue/finish
```

### FR-031 Step Limit

Each run must enforce a max step count.

Default:
- normal chat: 3 steps,
- workflow execution: 8 steps,
- asset generation: 8 steps.

### FR-032 Stop Conditions

The runtime must stop when final response is ready, user input is required, approval is required, max steps are exceeded, tool fails unrecoverably, or policy blocks action.

### FR-033 Run Trace

Each step must record decision input summary, decision output, tool call input, policy result, tool output, observation, and error if any.

## 5. Tool Registry And Executor

### FR-040 Tool Registry

Tools must be registered through a central registry.

Each tool must declare:
- `name`,
- `displayName`,
- `description`,
- `inputSchema`,
- `outputSchema`,
- `sideEffect`,
- `approvalPolicy`,
- `availability`,
- `handler`,
- `verification`.

### FR-041 Availability States

Tool availability must be one of:
- `available`,
- `disabled`,
- `stubbed`,
- `requires_integration`,
- `requires_configuration`.

The agent must not execute unavailable tools.

### FR-042 Central Tool Executor

All tool execution must go through one executor.

The executor must validate input, create tool-call record, emit planned/running/completed/failed events, run policy checks, execute handler, verify result, persist output, and return observation to kernel.

### FR-043 Tool Output Verification

Mutating tools must verify persistence before returning success.

Examples:
- Script Lab update must re-read Script Lab and confirm changed fields.
- Asset generation must confirm asset row/storage URL.
- Folder creation must confirm folder exists.
- Publish must confirm publish/scheduled ID if implemented.

## 6. Policy And Approval

### FR-050 Policy Engine

The policy engine must evaluate tool side effect, approval policy, user permissions, project status, overwrite risk, destructive intent, publishing risk, unavailable integration risk, and paid generation risk if applicable.

### FR-051 Approval Request

If approval is required, the runtime must create a pending tool-call record, store exact tool name and input, store approval reason, emit `awaiting_approval`, stop the run, and not execute the tool.

### FR-052 Approval Execution

On approval:
- load pending tool call,
- verify owner/project,
- verify status is `awaiting_approval`,
- load exact tool by `toolName`,
- validate stored input,
- run policy again,
- execute through central executor,
- mark completed or failed.

### FR-053 Reject

On reject, mark tool call `rejected`, store rejection reason if provided, and do not execute the tool.

### FR-054 Ask For Changes

On ask-for-changes, mark tool call `awaiting_input`, store requested changes, and resume the pending action with context on the next user message.

## 7. Creative Brief

### FR-060 Canonical Creative Brief

Creative Brief must be persisted in a dedicated table or canonical project state object.

Required fields:
- audience,
- platform,
- format,
- durationSeconds,
- tone,
- coreAngle,
- viewerPromise,
- viewerEmotion,
- creatorPersona,
- visualStyle,
- CTA,
- constraints,
- assumptions,
- rejectedDirections,
- openQuestions.

### FR-061 Brief Update Tool

The agent must be able to update the brief safely. It must merge fields, preserve existing approved fields, support overwrite only when explicit, and track source run/tool call.

### FR-062 Open Questions

The agent must maintain open questions and resolved answers. The decision engine must avoid re-asking resolved questions.

## 8. Active Goal

### FR-070 Active Goal

The agent must support one active goal per project/thread context.

Goal fields:
- title,
- status,
- stage,
- completed steps,
- next actions,
- blockers,
- metadata.

### FR-071 Goal Stage Progression

Allowed stages:
- ideating,
- briefing,
- scripting,
- asset_planning,
- generating_assets,
- editing,
- publishing,
- analyzing,
- complete.

### FR-072 Goal-Aware Decisions

If an active goal exists, decisions must consider current stage, completed steps, next actions, and project snapshot readiness.

## 9. Workflows

### FR-080 Script Workflow

The script workflow must inspect brief and Script Lab, ask missing questions only when needed, generate script package, critique script, save to Script Lab when safe/requested, create version/artifact, and update goal/stage.

### FR-081 Script Versioning

Script updates must create or update a version record/artifact. The active version must be clear.

### FR-082 Asset Workflow

The asset workflow must infer modality, generate prompt JSON, choose/reuse folder, generate media, verify saved asset, attach or confirm asset association, and update goal/stage.

### FR-083 Workspace Control Workflow

Natural-language workspace updates must support saving hook, saving CTA, updating script, adding shoot-pack tasks, creating folders, moving assets, organizing assets, and preparing Instagram packages.

Ambiguous targets must trigger clarification, not guessing.

### FR-084 Publish Preparation

The agent may prepare a publish package automatically. Actual publishing/scheduling must require approval and real integration availability.

### FR-085 Editor Handoff

Until editor mutation is implemented, the agent must generate an editor handoff artifact instead of pretending to edit the timeline.

## 10. UI Events

### FR-090 Event Types

Runtime stream must support:
- `run_started`,
- `snapshot_loaded`,
- `decision`,
- `plan`,
- `tool_planned`,
- `tool_running`,
- `tool_completed`,
- `tool_failed`,
- `approval_required`,
- `goal_updated`,
- `message_delta`,
- `run_completed`,
- `run_failed`.

### FR-091 Final Response Ordering

For execution runs:
- tool events must be emitted before final response,
- final response must be based on observations,
- final response must not claim incomplete/failed actions.

## 11. Tests

### FR-100 Trajectory Tests

Automated tests must verify expected decisions, tool sequence, policy state, and final response constraints.

### FR-101 Regression Cases

Required regression cases:
- vague script asks questions,
- detailed script saves,
- critique-only does not save,
- save hook changes only hook,
- asset generation verifies asset,
- ambiguous asset move asks question,
- publish requires approval,
- placeholder editor tool does not pretend success,
- failed tool does not produce success claim.
