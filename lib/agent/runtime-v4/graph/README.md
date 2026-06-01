# SceneBook Runtime v4 LangGraph Orchestrator

This directory contains the Agent Runtime v4 LangGraph orchestration path. LangGraph owns node execution, graph state transitions, loop routing, and deterministic stop checks. SceneBook still owns product logic: ProjectMind, model gateway calls, decision schemas, policy boundaries, event vocabulary, tracing metadata, and tool execution contracts.

## Runtime Path

The graph currently runs this loop:

1. `load_project_mind`
2. `understand_intent`
3. `decide_next_step`
4. `execute_step`
5. `observe_result`
6. `check_goal`
7. continue to `decide_next_step` or stop at `compose_response`

## Boundaries

- ProjectMind remains the canonical project memory and context source.
- Graph nodes do not directly mutate the database.
- Tool and workflow decisions are routed through an injectable executor; when none is wired, `execute_step` returns a typed blocked observation.
- Stop rules are deterministic: final response, clarifying question, approval required, unrecoverable error, max steps, or goal satisfied.
- Runtime v4 events map back to the existing chat stream contract for UI compatibility.

`AGENT_ORCHESTRATOR=langgraph` selects this path. `AGENT_ORCHESTRATOR=custom` keeps the custom runtime loop.
