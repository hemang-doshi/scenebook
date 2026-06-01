# SceneBook Agent Harness Runtime — Current Gap Analysis

## Snapshot Context

This document captures the gaps identified in the current SceneBook agent direction before rebuilding the agent harness on a fresh branch.

The goal is not to build a fully autonomous coding agent. The goal is to build a production-grade SceneBook creative workspace agent that can understand, maintain, and operate a SceneBook project across ideation, scripting, asset planning, asset generation, editor handoff, publishing preparation, and analytics-driven iteration.

## Current Runtime Diagnosis

The current implementation is better than a basic chatbot, but it is not yet a true agent harness.

It behaves like:

```txt
User message
  -> regex / command routing
  -> hard-coded workflow branch
  -> optional LLM content generation
  -> fixed tool sequence
  -> final response
```

The target should behave like:

```txt
User goal
  -> load project snapshot
  -> reason over state, goal, memory, tools, and policy
  -> decide next action
  -> execute or request approval
  -> observe result
  -> update state
  -> continue, ask, or finish
```

## Key Issues To Fix First

### 1. Regex-driven routing is pretending to be agent reasoning

Current mode selection relies heavily on keyword detection. This is brittle and creates demo-friendly behavior instead of context-aware behavior.

Issues:
- Intent detection breaks when the user phrases requests naturally.
- The agent cannot infer nuanced user intent from project state.
- Slash commands still behave as primary execution paths instead of hints.
- A phrase like "make it stronger and keep it as the main version" may not reliably map to critique -> rewrite -> save.

Required fix:
- Keep regex as a fallback hint only.
- Add a model-driven structured `AgentDecision` step.
- The decision must choose between final answer, ask question, plan, tool call, workflow, or approval request.

### 2. Plans are static, not state-aware

Current plans map workflows to default tool sequences. This is useful, but not agentic.

Issues:
- Script workflow always assumes the same sequence.
- Asset workflow assumes prompt -> folder -> generate -> attach.
- Goal mode tracks stage but does not truly execute the goal.
- The agent does not inspect whether script, assets, shoot pack, editor state, or publish package already exist before deciding.

Required fix:
- Introduce a `ProjectSnapshot`.
- Plans must be based on actual project state.
- Workflows should be adaptive state machines, not fixed arrays.

### 3. The API route owns too much runtime logic

The agent route currently acts as:
- HTTP adapter
- mode router
- planner
- workflow runner
- tool executor
- policy engine
- approval handler
- stream encoder
- legacy fallback path

Issues:
- Hard to test.
- Hard to extend.
- Easy to introduce inconsistent behavior across script, asset, review, and workspace-control flows.
- Approval behavior and tool execution become duplicated.

Required fix:
- Move runtime logic into `lib/agent/runtime-v3`.
- Keep the API route thin.

### 4. Tool calls are recorded, but the model is not truly choosing tools

The tool registry exists, but most tools are called by hard-coded route branches.

Issues:
- The agent cannot dynamically choose tools from project context.
- Tool availability is not fully exposed to the reasoning step.
- It cannot decide when to skip, repeat, retry, inspect, or ask before a tool call.

Required fix:
- Introduce one central executor.
- Let the model produce structured tool-call decisions.
- Validate all tool calls through schemas and policy before execution.

### 5. Approval flow is not production-safe

Approval must not depend on old command names or inferred command behavior.

Issues:
- Approval should execute the exact stored tool call by `toolName` and `input`.
- Current approval logic risks mixing old slash-command semantics with runtime-v2 tools.
- A pending tool call should be immutable except for explicit user-edited input.
- Policy should be checked again at approval time.

Required fix:
- Store `tool_name`, `tool_input`, `risk`, `approval_reason`, and `state_snapshot_id`.
- On approval, load exact tool by name, validate input, re-check policy, execute, then record output.

### 6. Creative Brief is not first-class enough

A creative brief table exists conceptually, but the brief is not yet the canonical context object.

Issues:
- Brief information may be pushed into notes instead of a structured table.
- The agent cannot reliably know which creative fields are known, missing, rejected, or approved.
- Open questions are not treated as first-class state.

Required fix:
- Make `project_creative_briefs` the source of truth.
- Track approved fields, open questions, assumptions, and rejected directions.

### 7. Memory is shallow

Recent messages and recent tool calls are not enough for production-grade project continuity.

Issues:
- The agent needs to remember approved decisions, rejected options, selected script version, asset choices, and analytics learnings.
- There is no durable state summary per project stage.
- The agent may repeat questions or lose earlier creative direction.

Required fix:
- Add project memory snapshots and decision records.
- Separate conversation memory from project memory.
- Add a compact run summary after meaningful agent runs.

### 8. Tools mutate workspace directly without a consistent patch layer

Some tools directly update project data.

Issues:
- No common diff/preview format.
- Hard to support undo.
- Hard to approve only specific changed fields.
- Hard to version scripts, briefs, assets, or editor changes.

Required fix:
- Add a `ProjectPatch` abstraction.
- Tools should return proposed patches or safe mutation results.
- Risky patches should be previewed before approval.

### 9. Placeholder tools can overpromise

Editor and Instagram publishing tools may exist as plugin entries while not fully implemented.

Issues:
- The agent may claim capability it does not have.
- Tool cards may show operations that cannot complete.
- User trust is damaged if "publish" or "import to editor" fails because it was a placeholder.

Required fix:
- Mark unavailable tools explicitly.
- The decision engine must know whether a tool is `available`, `stubbed`, `disabled`, or `requires_integration`.

### 10. Asset attachment semantics are unclear

A tool should not claim an asset was attached unless it actually performed or verified that relationship.

Issues:
- Fake success states are worse than failed states.
- Final response may claim workspace changes that did not happen.

Required fix:
- Every mutating tool must verify the persisted state after write.
- Tool output must include verification evidence.

## Production-Grade Definition

The rebuilt agent will be considered production-grade when it can:

1. Load a full project snapshot.
2. Infer user intent from message + project state + active goal.
3. Decide whether to answer, ask, plan, call a tool, or request approval.
4. Execute tools through one validated executor.
5. Maintain project memory and creative brief state.
6. Produce visible tool events before final claims.
7. Require approval for risky/destructive/publishing actions.
8. Never claim a workspace change that was not verified.
9. Support trajectory tests for agent behavior.
10. Stay extensible for future editor creation/editing features.

## Non-Goal

This is not an attempt to build a fully autonomous Claude Code clone.

SceneBook Agent should not arbitrarily manipulate code or the filesystem. It should operate the SceneBook workspace through approved project tools and domain-specific creative workflows.
