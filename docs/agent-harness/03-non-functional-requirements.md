# Non-Functional Requirements — SceneBook Agent Harness

## 1. Reliability

### NFR-001 No False Workspace Claims

The agent must never claim that a workspace mutation occurred unless the corresponding tool call completed and verified persistence.

Target: zero known false workspace claims.

### NFR-002 Safe Failure

If a tool fails:
- the tool card must show failed state,
- the run must stop or recover explicitly,
- the final message must not imply success,
- the user must receive a clear next step.

### NFR-003 Idempotency

Mutating tools should be idempotent where possible.

Examples:
- creating an existing folder should reuse it,
- saving the same script patch should not create duplicate noisy artifacts,
- preparing publish package should update draft/version rather than duplicate blindly.

## 2. Security And Permissions

### NFR-010 Auth Required

All agent APIs must require authenticated user context.

### NFR-011 Ownership Enforcement

All project, thread, run, message, tool-call, asset, goal, and brief operations must enforce owner/project scope.

### NFR-012 No Raw Database Tool

The model must never receive a raw SQL/database-write tool.

All actions must be domain-specific typed tools.

### NFR-013 Integration Boundaries

External integrations such as Instagram publishing must be disabled unless configured, require approval, verify account ownership, and return external IDs after success.

## 3. Privacy

### NFR-020 Context Minimization

Only relevant project context should be sent to the model.

Avoid dumping full unrelated project history, unnecessary analytics data, or full asset metadata if summaries are enough.

### NFR-021 Inspectable Memory

Long-term memory should be represented as structured, inspectable project memory, not hidden unreviewable blobs.

## 4. Performance

### NFR-030 Latency

Expected response starts:
- chat/brainstorm: under 3 seconds to first token when model is healthy,
- tool workflow: under 2 seconds to first progress event,
- asset generation: progress event before long-running generation.

### NFR-031 Step Budget

Default max agent steps:
- brainstorm/final answer: 3,
- script workflow: 8,
- asset workflow: 8,
- approval resume: 4.

### NFR-032 Token Budget

The project snapshot should be compacted before model calls.

Target:
- normal decision context below 8k tokens,
- long project history summarized into memory snapshots.

## 5. Observability

### NFR-040 Run Trace

Each agent run must be debuggable.

Store:
- run ID,
- thread ID,
- input,
- snapshot summary,
- decisions,
- tool calls,
- policy checks,
- observations,
- final response,
- errors,
- model IDs,
- token/cost metadata if available.

### NFR-041 Event Replay

A developer should be able to reconstruct a run from persisted records.

### NFR-042 Trace Redaction

Sensitive data should be redacted from logs where appropriate.

## 6. Maintainability

### NFR-050 Thin Route

The main API route should remain a thin adapter.

Target:
- no workflow-specific branching in route,
- no direct tool implementations in route.

### NFR-051 Tool Contract Consistency

Every tool must follow the same contract:
- schema,
- policy metadata,
- handler,
- verification,
- display summary.

### NFR-052 Testability

Core runtime modules must be unit-testable without running the Next.js route.

Testable modules:
- decision parser,
- policy engine,
- project snapshot builder,
- executor,
- workflow state machines,
- final response builder.

## 7. UX Trust

### NFR-060 Transparent Actions

The user must see:
- what the agent plans,
- what tool is running,
- what changed,
- what requires approval,
- what failed.

### NFR-061 Approval Clarity

Approval cards must show:
- action name,
- reason,
- fields to change,
- risk,
- before/after preview where relevant,
- approve/reject/request changes actions.

### NFR-062 No Capability Overpromise

Stubbed tools must be clearly marked unavailable.

The agent must say:

```txt
I can prepare an editor handoff package, but timeline editing is not wired yet.
```

instead of:

```txt
Imported to editor.
```

## 8. Extensibility

### NFR-070 Plugin Extensibility

Adding a new capability should require adding a plugin/tool, adding tests, and optionally adding workflow hints.

It should not require editing the core API route.

### NFR-071 Future Editor Support

The architecture must support future editor tools:
- import asset,
- add to timeline,
- trim clip,
- add text overlay,
- arrange sequence,
- export draft.

All editor-write tools must support approval/diff preview.

## 9. Quality

### NFR-080 Evals

Agent behavior must be protected by automated trajectory tests.

Minimum:
- 15 deterministic unit tests,
- 10 workflow trajectory tests,
- 5 approval/policy tests,
- 5 failure-mode tests.

### NFR-081 Manual QA

Before merging:
- run lint,
- run typecheck,
- run unit tests,
- run build,
- manually test core chat workflows in browser.

## 10. Accessibility

### NFR-090 Keyboard Usability

Chat input, approval actions, thread selection, and tool cards should be keyboard accessible.

### NFR-091 Readability

Tool status labels and approval states must be readable in light/dark themes.

## 11. Compatibility

### NFR-100 Backward Compatibility

Existing project data should continue to load.

If new tables are missing:
- show setup/migration error clearly,
- do not silently degrade into broken behavior.

### NFR-101 Migration Safety

Migrations must be additive where possible.

No destructive migration without explicit backup path.
