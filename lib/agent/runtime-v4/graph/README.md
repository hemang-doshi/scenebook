# SceneBook Runtime v4 LangGraph Spike

This directory is an isolated orchestration spike. It evaluates LangGraph as a graph runner for SceneBook Agent Runtime v4 without replacing SceneBook's domain-specific runtime concepts.

## What Runs

The graph currently has one deterministic path:

1. Load ProjectMind through the existing `buildProjectMind` abstraction.
2. Understand the user intent from the goal and ProjectMind context.
3. Propose a no-write content plan.
4. Produce a final response from the proposed plan.

## Boundaries

- ProjectMind remains the canonical project memory and context source.
- The graph does not write directly to the database.
- The graph does not call external integrations.
- The graph does not execute runtime tools.
- The production custom runtime remains the default unless `AGENT_ORCHESTRATOR=langgraph` is explicitly set.

## Why This Shape

LangGraph is being tested for orchestration mechanics: typed state, named nodes, explicit edges, and testable graph execution. SceneBook still owns memory semantics, tool contracts, policy, ProjectPatch, persistence, and product-specific decisions.
