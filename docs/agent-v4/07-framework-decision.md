# Framework Decision - LangGraph Runtime Orchestration

## Decision

SceneBook uses LangGraph as an Agent Runtime v4 orchestration option behind `AGENT_ORCHESTRATOR=custom | langgraph`. The custom loop remains available, while the LangGraph path is now a real runtime path instead of a sidecar spike.

LangGraph owns orchestration mechanics. SceneBook owns product logic and safety boundaries.

## What LangGraph Owns

LangGraph owns:

- named node execution,
- typed graph state transitions,
- explicit loop routing,
- deterministic stop-condition checkpoints,
- testable graph-level state snapshots,
- future resumability and replay structure.

The current runtime graph runs:

1. `load_project_mind`
2. `understand_intent`
3. `decide_next_step`
4. `execute_step`
5. `observe_result`
6. `check_goal`
7. `compose_response`

`check_goal` routes back to `decide_next_step` until a stop condition is reached.

## What SceneBook Owns

SceneBook continues to own:

- ProjectMind memory semantics,
- ProjectPatch and workspace mutation representation,
- typed tool contracts and tool execution,
- approval and policy decisions,
- database persistence,
- model gateway and provider routing,
- integration capability checks,
- runtime event vocabulary,
- run tracing metadata,
- eval expectations and user-facing response rules.

Graph nodes call these abstractions. They do not directly mutate the database, and tool/workflow decisions return a typed blocked observation unless an executor is explicitly injected.

## Event Contract

Runtime v4 graph events use these stable names:

- `run_started`
- `agent_thinking`
- `decision_made`
- `tool_planned`
- `tool_running`
- `tool_completed`
- `tool_failed`
- `approval_required`
- `memory_updated`
- `final_response`
- `run_completed`

The kernel maps these events to the current chat stream events so the existing UI can continue to consume `run_started`, `snapshot_loaded`, `decision`, `plan`, tool events, `message_delta`, and `run_completed`.

## Stop Rules

The graph stops when:

- `finalResponse` exists,
- a clarifying question exists,
- approval is required,
- an unrecoverable error exists,
- the max step count is reached,
- the goal checker marks the goal satisfied.

This keeps LangGraph from becoming an unbounded model loop.

## Rollback Plan

Rollback remains straightforward:

1. Set `AGENT_ORCHESTRATOR=custom`.
2. Keep the runtime-v4 custom loop as the public fallback.
3. Remove the LangGraph branch from `runtime-v4/kernel.ts` only after replacing it with an equivalent tested path.
4. Remove `lib/agent/runtime-v4/graph/` and LangGraph dependencies if the approach is rejected.
