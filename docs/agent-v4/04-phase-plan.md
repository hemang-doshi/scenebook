# Phase Plan - SceneBook Agent v4

## 1. Phase Strategy

Agent v4 should ship in small, verifiable phases. Each phase must leave the product in a stable state and increase production confidence without hiding unfinished runtime behavior behind chat copy.

The first phase is specs only. Runtime implementation begins only after the product, architecture, evaluation, and integration contracts are agreed.

## 2. Phase 00 - Specs And Architecture

### Goal

Define the production architecture for SceneBook Agent v4.

### Deliverables

- Product requirements.
- Functional requirements.
- Non-functional requirements.
- Target architecture.
- Phase plan.
- Evaluation plan.
- Integration strategy.

### Explicit Non-Deliverables

- No runtime code.
- No migrations.
- No UI changes.
- No provider SDK changes.
- No Google auth implementation.
- No Nango implementation.

### Exit Criteria

- Docs are committed under `docs/agent-v4/`.
- The repo's available lint, typecheck, and test scripts have been run.
- The branch is pushed for review.

## 3. Phase 01 - Runtime Foundations

### Goal

Create the minimum Agent Runtime v4 shell without changing user-facing behavior.

### Deliverables

- Runtime module skeleton.
- Thin transport boundary.
- Run lifecycle types.
- Event stream types.
- Identity context object from Google auth.
- Trace correlation IDs.
- Feature flag.
- Unit tests for run creation and stop conditions.

### Exit Criteria

- Agent v4 can start and complete a no-op conversational run behind a feature flag.
- No existing runtime behavior regresses.
- Traces are emitted for no-op runs.

## 4. Phase 02 - Model Gateway

### Goal

Route all v4 model calls through a provider-neutral gateway with Gemini support.

### Deliverables

- Model role registry.
- Provider adapter interface.
- Default provider adapter.
- Gemini adapter.
- Structured output helper.
- Retry and fallback policy.
- Cost and latency metadata capture.
- Contract tests with mocked providers.

### Exit Criteria

- Runtime can request structured decisions through the gateway.
- Gemini can be configured for eligible roles.
- Provider failures normalize into runtime errors.
- No workflow imports provider SDKs directly.

## 5. Phase 03 - ProjectMind Memory

### Goal

Create the durable project memory layer that gives the agent production context.

### Deliverables

- ProjectMind conceptual schema implemented in storage.
- Loader for full project memory.
- Compactor for model context.
- Memory write tools.
- Provenance and confidence fields.
- Memory inspection surface or developer view.
- Tests for load, compact, write, and correction flows.

### Exit Criteria

- Agent v4 can load project memory for every project run.
- Compact context includes stage, brief, active goal, script state, asset state, and open questions.
- Memory writes are typed and traceable.

### Implementation Note

The current ProjectMind implementation uses the existing Supabase-authenticated `owner_id` model and RLS policies. External integration memory is exposed as a placeholder in context until the integration phase; no Nango or Google auth implementation is included in this phase.

## 6. Phase 04 - ProjectPatch And Typed Tool Runtime

### Goal

Introduce safe mutation architecture before expanding autonomy.

### Deliverables

- ProjectPatch schema.
- Patch validator.
- Patch preview formatter.
- Patch apply and verification path.
- Tool registry.
- Tool executor.
- Initial tools for brief, script, goals, shoot tasks, assets metadata, and editor handoff artifact.
- Tool and patch contract tests.

### Exit Criteria

- No workspace mutation happens outside ProjectPatch or typed tools.
- Mutating tools verify persistence.
- Failed verification prevents success claims.

## 7. Phase 05 - Policy And Approvals

### Goal

Make risky actions explicit, reviewable, and exact.

### Deliverables

- Policy engine.
- Approval categories.
- Pending approval records.
- Approval, rejection, and ask-for-changes flow.
- UI approval card.
- Tests for approval bypass prevention.

### Exit Criteria

- Publishing, destructive edits, external side effects, paid generation, and overwrites require approval.
- Approved actions execute exact approved inputs.
- Rejected actions never execute.

## 8. Phase 06 - Conversational-First Agent UI

### Goal

Make the agent feel like an operational creative workspace, not a generic chatbot.

### Deliverables

- Conversation surface with run events.
- Plan display.
- Tool progress rows.
- Patch preview cards.
- Approval cards.
- ProjectMind highlights.
- Active goal display.
- Verified final-response summaries.
- Recovery states for failures.

### Exit Criteria

- Users can understand what the agent is doing while it works.
- Approval prompts clearly describe exact changes and side effects.
- The final response distinguishes completed, failed, blocked, and pending actions.

## 9. Phase 07 - Nango Integration Bridge

### Goal

Expose external account capabilities safely through typed tools.

### Deliverables

- Nango connection-state loader.
- Integration capability summaries in ProjectMind.
- Typed integration adapter interface.
- Initial external integration tools.
- Disconnected-account UI path.
- Approval policy for external side effects.
- Contract tests with mocked Nango responses.

### Exit Criteria

- The agent can detect connected and disconnected accounts.
- Integration tools never expose raw tokens to prompts or traces.
- External side effects require approval.

## 10. Phase 08 - Evals And Trajectory Tests

### Goal

Make agent behavior testable before production rollout.

### Deliverables

- Fixture format.
- Offline trajectory runner.
- Golden project states.
- P0 workflow tests.
- Truthfulness assertions.
- Approval-boundary assertions.
- Model gateway provider eval suite.
- CI command for evals.

### Exit Criteria

- P0 trajectories pass deterministically.
- False-claim regressions are covered.
- Approval-bypass regressions are covered.
- Provider evals are separate from deterministic runtime tests.

## 11. Phase 09 - Production Hardening

### Goal

Prepare Agent v4 for private beta.

### Deliverables

- Timeout and retry tuning.
- Cost and latency dashboards.
- Error classification.
- Trace redaction.
- Retention policy.
- Recovery and replay tools.
- Load and soak tests.
- Security review.

### Exit Criteria

- Engineers can debug failed runs from traces.
- Secrets are redacted.
- Latency and cost are within configured targets.
- Runtime can recover from partial failures.

## 12. Phase 10 - Private Beta

### Goal

Launch Agent v4 to a small set of real creator workflows.

### Initial Workflow Scope

- project-aware ideation,
- brief creation,
- script drafting,
- script revision,
- shoot task generation,
- asset planning,
- editor handoff artifact,
- publish package draft.

### Deferred From Beta

- autonomous editor timeline mutation,
- live publishing without manual review,
- team permissioning,
- cross-project autonomous campaigns,
- browser automation,
- unbounded background agents.

### Exit Criteria

- Private beta users complete P0 workflows.
- False mutation claims remain zero.
- Approval-bypass incidents remain zero.
- Evals catch known regressions.
- Product team has enough trace and feedback data for broader launch.

## 13. Phase Dependencies

| Phase | Depends On |
|---|---|
| 01 Runtime Foundations | 00 Specs |
| 02 Model Gateway | 01 Runtime Foundations |
| 03 ProjectMind | 01 Runtime Foundations |
| 04 ProjectPatch And Tools | 01, 03 |
| 05 Policy And Approvals | 04 |
| 06 UI | 01, 04, 05 |
| 07 Nango Integrations | 01, 04, 05 |
| 08 Evals | 01, 02, 03, 04, 05 |
| 09 Hardening | 01-08 |
| 10 Beta | 09 |

## 14. Implementation Principles

- Keep the runtime boring and inspectable.
- Prefer explicit typed operations over model-generated freeform mutations.
- Build evals alongside behavior, not after launch.
- Expand autonomy only after traces, policy, and approvals are proven.
- Do not claim integration or editor capabilities before they exist.
- Treat final response truthfulness as a product requirement.
