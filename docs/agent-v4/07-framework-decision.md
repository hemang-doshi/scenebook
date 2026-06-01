# Framework Decision - LangGraph Orchestration Spike

## Decision

SceneBook should evaluate LangGraph as the orchestration layer for Agent Runtime v4, but only as a graph runner around SceneBook-owned abstractions. The spike is intentionally isolated behind `AGENT_ORCHESTRATOR=custom | langgraph`, with `custom` as the default.

This is not a production migration. It is a proof point for whether explicit graph state and node edges make the runtime easier to test, replay, and evolve.

## What LangGraph Will Own

LangGraph can own the orchestration mechanics:

- named node execution,
- typed graph state transitions,
- explicit edges between runtime phases,
- resumable or inspectable control flow in future phases,
- graph-level test harnesses,
- branching and retry structure when the runtime grows beyond a linear loop.

In the spike, LangGraph owns only this path:

1. Load ProjectMind.
2. Understand intent.
3. Propose a plan.
4. Produce a final response.

## What SceneBook Will Continue To Own

SceneBook must keep ownership of the domain model and operational safety boundaries:

- ProjectMind memory semantics,
- ProjectPatch and workspace mutation representation,
- typed tool contracts and tool execution,
- approval and policy decisions,
- database persistence,
- model gateway/provider routing,
- integration capability checks,
- trace and eval vocabulary,
- user-facing response rules.

LangGraph should call these abstractions. It should not replace them with generic agent concepts.

## Why Plain LangChain `create_agent` Is Not Enough

Plain `create_agent` is useful for model-plus-tools loops, but SceneBook needs more than a generic ReAct agent:

- ProjectMind is canonical context, not chat history alone.
- Workspace changes must flow through ProjectPatch, policy, approval, and verification.
- Tools need SceneBook-specific availability, risk, and side-effect metadata.
- The runtime needs deterministic checkpoints before database writes or external actions.
- Evals need named phases and state snapshots, not just final model messages.

LangGraph is a better fit for evaluating orchestration because it lets SceneBook keep explicit nodes and state while still benefiting from a graph runtime.

## Why ProjectMind Remains Canonical

ProjectMind combines durable project memory, current production state, recent run summaries, selected and rejected outputs, readiness, and compact model context. It is the source of truth the runtime should inspect before planning.

The LangGraph spike uses `buildProjectMind` directly and then compacts the snapshot with `compactProjectMindForModel`. The graph does not create an alternate memory store, does not infer persistent facts on its own, and does not write memories directly.

## Risks

- LangGraph could add complexity before SceneBook needs graph-level branching.
- Generic graph state could drift away from SceneBook domain types if not constrained.
- Developers could accidentally bypass ProjectPatch or policy by adding write-capable nodes.
- Runtime observability could split between LangGraph traces and SceneBook traces.
- Dependency churn in LangGraph/LangChain could affect the agent runtime surface.

## Rollback Plan

Rollback is straightforward because the spike is sidecar-only:

1. Keep `AGENT_ORCHESTRATOR=custom`, which is the default.
2. Remove `lib/agent/runtime-v4/graph/` if the spike is rejected.
3. Remove the `runLangGraphSpike` feature-flag branch from `runtime-v4/kernel.ts`.
4. Remove `@langchain/langgraph` and `@langchain/core` from dependencies.
5. Keep ProjectMind, the custom kernel, typed tools, and ProjectPatch plans unchanged.

No production traffic depends on LangGraph unless `AGENT_ORCHESTRATOR=langgraph` is explicitly enabled.
