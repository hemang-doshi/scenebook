# Non-Functional Requirements - SceneBook Agent v4

## 1. Reliability

### NFR-001 No False Mutation Claims

The agent must never claim that a workspace change, external action, publish event, asset generation, memory write, or approval-gated operation happened unless the corresponding tool or ProjectPatch completed and verification passed.

### NFR-002 Graceful Failure

When a model, tool, integration, memory store, or patch application fails, the runtime must stop safely, preserve the trace, and tell the user what did and did not happen.

### NFR-003 Idempotency

Mutating operations must be idempotent where practical. Retried tool calls and patch applications must not create duplicate scripts, assets, publish packages, or external posts unless explicitly designed to do so.

### NFR-004 Retry Boundaries

Retries must be bounded and visible in traces. Destructive, publishing, or external side-effect actions must not retry blindly.

## 2. Correctness And Trust

### NFR-010 Schema Validation

All model decisions, tool inputs, tool outputs, ProjectPatch operations, memory writes, and integration responses must be validated against schemas.

### NFR-011 Deterministic Policy

Approval and safety policy decisions must be deterministic code paths, not model-only judgments.

### NFR-012 Workspace Truth

The persisted project state is the source of truth. Chat messages, model outputs, and unverified observations are not authoritative.

### NFR-013 Version Preservation

The system should prefer creating versions and drafts over destructive overwrites.

## 3. Security

### NFR-020 Identity Enforcement

Every agent run and mutation must be bound to a Google-authenticated user and checked against project permissions.

### NFR-021 Secret Handling

Provider API keys, OAuth tokens, Nango credentials, service-role keys, and integration secrets must never be exposed in prompts, client events, traces, logs, or eval fixtures.

### NFR-022 Least Privilege

Integration scopes should be the minimum required for the configured tool. Tools must not request broad external permissions for future capabilities.

### NFR-023 Server-Side Execution

Sensitive tool execution, model calls, Nango token exchange, and ProjectPatch application must run server-side.

### NFR-024 Prompt Injection Resistance

External documents, captions, comments, analytics, and imported assets must be treated as untrusted content. The runtime must separate user instructions, system policy, tool descriptions, and retrieved content.

## 4. Privacy

### NFR-030 Memory Transparency

Durable ProjectMind memory must be inspectable by the user. Users must be able to correct or delete user-facing memory records according to product policy.

### NFR-031 Data Minimization

Prompts should include the smallest useful project context. Compact ProjectMind context is preferred over raw database dumps.

### NFR-032 Trace Redaction

Traces must redact secrets and avoid storing unnecessary raw content when compact summaries are sufficient for debugging.

## 5. Performance

### NFR-040 First Feedback Latency

The UI should show the agent run has started within 500 ms after the server accepts the request under normal conditions.

### NFR-041 Streaming Progress

Long-running workflows must stream progress events before final completion.

### NFR-042 Typical Response Targets

Recommended latency targets:

- conversational response: under 8 seconds p50,
- patch proposal: under 10 seconds p50,
- script draft: under 20 seconds p50,
- asset generation: progress within 5 seconds, completion depends on provider,
- integration action: progress within 3 seconds after approval.

### NFR-043 Context Budget

ProjectMind compaction must keep routine prompts within configured token budgets. Large assets and long transcripts should be summarized or referenced rather than injected wholesale.

## 6. Scalability

### NFR-050 Stateless Transport

HTTP entry points should remain horizontally scalable. Runtime state should be persisted in stores and traces rather than in process memory.

### NFR-051 Async-Ready Workflows

The architecture must allow long-running asset generation, imports, and integration syncs to move to background jobs without changing the public tool contract.

### NFR-052 Bounded Run Cost

The runtime must enforce max steps, model-role budgets, and tool timeouts to prevent runaway agent loops.

## 7. Observability

### NFR-060 Trace Completeness

Every run must include spans for:

- request validation,
- auth and permission checks,
- ProjectMind load and compaction,
- model gateway calls,
- decisions,
- policy checks,
- ProjectPatch validation and apply,
- tool execution,
- integration calls,
- memory writes,
- final response.

### NFR-061 Correlation IDs

Runs, tool calls, patches, model calls, integration calls, and UI events must share correlation IDs.

### NFR-062 Metrics

The system must emit metrics for latency, token use, cost where available, failure type, approval rate, tool success rate, verification failure rate, and trajectory eval pass rate.

### NFR-063 Debuggability

An engineer should be able to diagnose a failed run from trace data without reproducing the user's exact environment or exposing secrets.

## 8. Maintainability

### NFR-070 Modular Runtime

Runtime modules must separate transport, kernel, memory, model gateway, decisioning, policy, ProjectPatch, tool execution, integrations, observability, and evals.

### NFR-071 Tool Extensibility

Adding a new tool should not require changes to the agent route or unrelated workflows. New tools must register schemas, policy metadata, verification, and tests.

### NFR-072 Provider Extensibility

Adding a model provider or Gemini model variant should happen through the model gateway, not by editing workflow code.

### NFR-073 Integration Extensibility

Adding an external integration should happen through Nango connection metadata plus a typed adapter/tool, not direct OAuth logic inside agent workflows.

## 9. Testability

### NFR-080 Offline Tests

Core runtime, ProjectPatch, policy, memory compaction, and tool executor tests must run offline.

### NFR-081 Deterministic Fixtures

Trajectory tests must be deterministic and must not depend on live model provider responses.

### NFR-082 Contract Tests

Tool schemas, ProjectPatch schemas, model gateway adapters, and Nango integration adapters must have contract tests.

### NFR-083 Regression Coverage

Known false-claim, approval-bypass, overwrite, and integration-unavailable cases must become regression tests.

## 10. User Experience

### NFR-090 Conversational Momentum

The agent should keep the user moving by drafting safe artifacts and asking only when needed.

### NFR-091 Inspectability Without Noise

Plans, patches, and tool events must be visible in friendly language. Raw traces should be available only in advanced or developer views.

### NFR-092 Approval Clarity

Approval prompts must clearly explain:

- what will change,
- where it will change,
- whether an external system is affected,
- whether cost may be incurred,
- what happens if the user rejects.

### NFR-093 Accessibility

Agent UI states, approvals, patch previews, and progress events must be usable with keyboard navigation and screen readers.

## 11. Availability And Recovery

### NFR-100 Provider Outage Handling

If a model provider, Gemini endpoint, integration, or storage provider is unavailable, the agent must degrade gracefully and explain the limitation.

### NFR-101 Pending Action Recovery

Pending approvals and long-running operations must survive refreshes and normal session interruptions.

### NFR-102 Partial Failure Recovery

If a workflow partially succeeds, the runtime must record completed operations, stop unsafe continuation, and offer a recovery path.

## 12. Compliance And Governance

### NFR-110 Audit Log

Agent-created changes must be auditable by user, project, time, run, tool, patch, and integration.

### NFR-111 Retention Policy

Trace, memory, and eval artifact retention must be configurable before production launch.

### NFR-112 External Terms

Publishing and platform integration tools must respect external platform policies and configured permissions.
