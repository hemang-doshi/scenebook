# Functional Requirements - SceneBook Agent v4

## 1. Identity And Access

### FR-001 Google Auth Identity

SceneBook must use Google auth as the primary user identity for Agent v4. Every agent run, tool call, ProjectPatch, memory write, integration call, approval, and trace must be associated with an authenticated user identity.

### FR-002 Project Ownership

The runtime must verify that the authenticated user can access the target project before loading ProjectMind, running tools, creating patches, or reading integration state.

### FR-003 Audit Attribution

All agent-created records must include user ID, project ID, run ID, timestamp, and source component.

### FR-004 Session Continuity

The UI must preserve the authenticated user's active project, thread, and pending approval state across page refreshes and normal navigation.

## 2. Runtime Entry

### FR-010 Thin Transport Layer

The API route or server action that receives agent messages must authenticate, validate the request, create a run, open the event stream, call Agent Runtime v4, and handle top-level errors.

It must not contain workflow-specific branches, direct tool handlers, prompt assembly, model provider logic, or ProjectPatch application logic.

### FR-011 Runtime Feature Flag

Agent Runtime v4 must be deployable behind a feature flag until launch criteria are met.

### FR-012 Run Types

The runtime must support these run types:

- conversational response,
- project planning,
- workspace mutation,
- asset generation,
- integration action,
- approval continuation,
- eval replay.

### FR-013 Event Stream

The runtime must stream structured events to the UI for run lifecycle, plan updates, tool status, approval requests, patch previews, memory changes, message deltas, and errors.

## 3. Agent Runtime v4 Loop

### FR-020 Agent Loop

The kernel must implement:

```txt
observe -> retrieve memory -> plan -> decide -> policy-check -> act -> verify -> remember -> respond
```

The runtime may use deterministic routing before model calls when the intent is obvious and safe.

### FR-021 Step Limits

Each run must enforce configurable step limits by run type.

Recommended defaults:

- conversational response: 3 steps,
- project planning: 5 steps,
- workspace mutation: 6 steps,
- asset generation: 8 steps,
- integration action: 8 steps,
- eval replay: deterministic fixture limit.

### FR-022 Stop Conditions

The runtime must stop when:

- a final response is ready,
- required user input is missing,
- approval is required,
- max steps are reached,
- a policy blocks the action,
- a tool fails unrecoverably,
- an integration is disconnected,
- the request violates a safety or permission boundary.

### FR-023 Structured Decisions

Model decisions must be schema-validated. Supported decision types:

- `final_response`,
- `ask_question`,
- `propose_plan`,
- `project_patch`,
- `tool_call`,
- `workflow_call`,
- `request_approval`,
- `stop_with_error`.

### FR-024 Decision Repair

Invalid model decisions must be repaired at most once. If repair fails, the runtime must fail safely with a traceable error.

## 4. ProjectMind Memory

### FR-030 Load ProjectMind

Every project-scoped run must load ProjectMind memory before planning.

Required memory areas:

- project metadata,
- production stage,
- creative brief,
- active goal,
- open questions,
- resolved answers,
- script versions,
- asset intent,
- shoot plan,
- editor handoff state,
- publish package state,
- integration connection summaries,
- user preferences,
- rejected directions,
- analytics learnings,
- recent run summaries.

### FR-031 Compact Context

ProjectMind must produce a compact model context that preserves the active production state without leaking unnecessary records into every prompt.

### FR-032 Provenance

Every memory entry must include provenance: source run, tool call or patch ID, author, timestamp, confidence, and whether the fact is user-approved, inferred, or system-derived.

### FR-033 Memory Writes

The agent may write to ProjectMind only through typed memory tools or ProjectPatch operations.

### FR-034 Memory Correction

Users must be able to correct durable memory. Corrected memory must supersede previous entries without losing audit history.

### FR-035 No Repeated Questions

The agent must not ask for information already resolved in ProjectMind unless the user explicitly asks to revisit it or the stored fact conflicts with the current request.

## 5. Model Gateway

### FR-040 Provider-Neutral Gateway

All model calls must go through a model gateway. Runtime modules must not call provider SDKs directly.

### FR-041 Gemini Support

The model gateway must support Gemini as a first-class provider for eligible tasks, including multimodal project understanding where configured.

### FR-042 Model Roles

The gateway must route by model role:

- planner,
- structured decision,
- creative drafting,
- critique,
- multimodal understanding,
- asset prompt generation,
- eval judge,
- summarizer.

### FR-043 Fallbacks

The gateway must support provider fallback policies by role. Fallback must preserve trace metadata and must not silently change a task's safety or cost profile.

### FR-044 Structured Output

For decisions and patches, the gateway must support structured output with schema validation and repair boundaries.

### FR-045 Cost And Latency Metadata

Every model call must record provider, model, role, token usage when available, latency, retry count, and error state.

## 6. Typed Tool Runtime

### FR-050 Tool Registry

All tools must be registered in a central typed registry.

Each tool must declare:

- name,
- display name,
- description,
- input schema,
- output schema,
- side effect category,
- approval policy,
- availability,
- required integration,
- handler,
- verification behavior,
- telemetry labels.

### FR-051 Tool Availability

Tool availability must be explicit:

- `available`,
- `disabled`,
- `stubbed`,
- `requires_configuration`,
- `requires_integration`,
- `requires_approval`,
- `blocked`.

The agent must not execute unavailable tools.

### FR-052 Central Executor

All tool execution must go through one executor that validates input, checks policy, records status, executes the handler, validates output, verifies side effects, writes telemetry, and returns observations to the runtime.

### FR-053 Tool Observation

Tool results must be converted into concise observations for the next agent step and detailed records for traces.

### FR-054 Verification

Mutating tools must verify persistence before returning success.

Examples:

- script update re-reads active script state,
- asset generation verifies storage and project attachment,
- folder creation verifies the folder exists,
- memory update verifies ProjectMind changed,
- publish action verifies external ID if implemented.

## 7. ProjectPatch Mutation Layer

### FR-060 Patch Representation

Workspace mutations must be represented as ProjectPatch objects before application.

A patch must include:

- target project,
- operations,
- human-readable summary,
- risk level,
- approval requirement,
- expected before/after state,
- author and run IDs,
- validation result,
- application result,
- verification result.

### FR-061 Patch Operations

Initial ProjectPatch operations must support:

- update creative brief field,
- add or resolve open question,
- create script version,
- set active script version,
- update script lab fields,
- add shoot task,
- update asset intent,
- create asset folder reference,
- attach asset to project,
- create editor handoff artifact,
- create publish package draft,
- update active goal.

### FR-062 Patch Preview

The UI must show a readable preview for patches that need approval or user review.

### FR-063 Patch Apply

ProjectPatch application must be atomic where practical. Partial application must be recorded explicitly and surfaced to the user.

### FR-064 Patch Reversal Metadata

When a patch is reversible, the system must record enough metadata to support rollback or manual recovery.

## 8. Approval Policies

### FR-070 Policy Engine

The policy engine must evaluate user identity, project permissions, tool side effects, patch risk, integration side effects, cost, overwrite risk, destructive risk, publishing risk, and configured workspace policy.

### FR-071 Approval Categories

Actions must fall into one of these approval categories:

- `auto`,
- `ask_if_overwrite`,
- `ask_if_external_side_effect`,
- `ask_if_costly`,
- `always_ask`,
- `blocked`.

### FR-072 Approval Request

When approval is required, the runtime must create a pending approval with exact tool or patch input, reason, expected side effect, and expiry.

### FR-073 Approval Execution

On approval, the runtime must reload the pending action, validate ownership, re-run policy, execute exactly the approved input, and record the result.

### FR-074 Rejection

On rejection, the runtime must mark the pending action rejected and must not execute the action.

### FR-075 Approval Truthfulness

The final response must not imply that an approval-gated action has run until the approved tool or patch completes and verifies.

## 9. Nango Integration Bridge

### FR-080 Connection State

The runtime must be able to query Nango-backed connection state for user integrations.

### FR-081 Integration Tools

External integration tools must declare the required provider and connection ID type.

### FR-082 Token Handling

Agent Runtime v4 must not expose raw OAuth tokens to prompts, UI events, or traces.

### FR-083 Disconnected Integrations

If a required integration is disconnected, the agent must offer a connection path instead of pretending the action is possible.

### FR-084 External Side Effects

Actions that create, update, schedule, publish, delete, or message external systems must require approval unless explicitly configured otherwise.

## 10. Production Workflows

### FR-090 Ideation Workflow

The agent must generate project-aware ideas, hooks, angles, and formats using ProjectMind. It must not mutate state unless asked or unless a safe draft artifact is explicitly configured.

### FR-091 Brief Workflow

The agent must create and refine the creative brief with platform, audience, format, viewer promise, emotional target, tone, CTA, visual style, and constraints.

### FR-092 Script Workflow

The agent must create, critique, revise, save, and version scripts through ProjectPatch and typed tools.

### FR-093 Asset Workflow

The agent must plan missing assets, create model-ready prompts, invoke configured generation or import tools, verify persistence, and attach outputs.

### FR-094 Editor Handoff Workflow

The agent must create editor handoff artifacts until direct editor mutation is implemented.

### FR-095 Publish Prep Workflow

The agent must prepare publish packages automatically when safe. Actual scheduling or publishing must require approval and an available integration.

### FR-096 Analytics Workflow

The agent must summarize performance, store durable learnings, and propose follow-up content.

## 11. Conversational-First UI

### FR-100 Agent Surface

The primary agent surface must be conversational, with project-aware replies and inline execution state.

### FR-101 Plan Display

When the agent proposes or runs a multi-step workflow, the UI must show a concise plan with current status.

### FR-102 Tool Event Display

The UI must display planned, running, completed, failed, and approval-required events in user-friendly language.

### FR-103 Patch Display

Patch previews must show what will change, which project area is affected, and whether approval is required.

### FR-104 Memory Visibility

Users must be able to inspect important ProjectMind facts and correct them.

### FR-105 No Raw Debug UX

The UI must not expose raw JSON by default. Advanced trace views may expose structured details for debugging.

## 12. Observability And Tracing

### FR-110 Trace Every Run

Every run must produce a trace that links request, identity, project, memory reads, model calls, decisions, policies, tools, patches, integrations, and final response.

### FR-111 Error Classification

Errors must be classified as validation, model, policy, tool, integration, persistence, network, timeout, or unknown.

### FR-112 Redaction

Traces must redact secrets, OAuth tokens, raw provider credentials, and sensitive content according to policy.

## 13. Evals And Trajectory Tests

### FR-120 Trajectory Fixtures

Trajectory tests must cover decisions, plans, tool sequences, patches, approval boundaries, and final-response truthfulness.

### FR-121 Offline Execution

Core evals must run offline with mocked model outputs, tool handlers, integrations, and storage.

### FR-122 Provider Evals

Model gateway provider behavior must be evaluated separately from deterministic runtime behavior.

### FR-123 Release Gate

Agent v4 cannot graduate from a feature flag until P0 trajectory tests pass.
