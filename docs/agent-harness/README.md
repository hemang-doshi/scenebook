# SceneBook Agent Harness

This folder documents the current Agent Runtime v2 harness as implemented on `codex/agent-runtime-v2`. It is an implementation map, not a new product spec.

The harness is the orchestration layer that turns a project chat request into a mode decision, optional plan, visible Tool Call events, workspace writes, persisted agent records, and a final assistant response.

## Entry Point

Runtime v2 is gated by:

```bash
AGENT_RUNTIME_V2_ENABLED=true
```

The active request path is `POST /api/projects/[id]/agent` in `app/api/projects/[id]/agent/route.ts`.

At a high level, the route:

1. Authenticates the user and loads the project workspace.
2. Creates or loads an `agent_threads` row and creates an `agent_runs` row.
3. Parses slash-command intent and extracts current creative context.
4. Selects a mode with `selectAgentMode`.
5. Builds a plan with `buildAgentPlan` when the mode needs a workflow/tool plan.
6. Streams mode, plan, goal, tool, and chunk events back to the client.
7. Persists assistant messages and completes or fails the run.

When the feature flag is off, the route falls back to the existing runtime behavior.

## Mode And Plan Layer

Mode selection lives in `lib/agent/runtime-v2/mode-selector.ts`.

Supported modes:

| Mode | Harness behavior |
| --- | --- |
| `brainstorm` | Streams 3-5 producer options, a recommendation, and a high-leverage question. No Tool Calls. |
| `plan` | Streams creative direction, stages, and next decision. No Tool Calls. |
| `goal` | Creates or advances a persistent Active Goal and streams the current goal summary. |
| `execute` | Builds a tool plan and runs Tool Calls when request intent is clear. |
| `review` | Critiques content and only updates workspace state when the request clearly asks to save, apply, or update. |
| `ask` | Asks missing-field questions and does not mutate the workspace. |

Plan construction lives in `lib/agent/runtime-v2/planner.ts`. Plans resolve a workflow, missing creative fields, questions, creative options, structured plan steps, and tool sequence. The current workflow definitions are in `lib/agent/runtime-v2/workflows/`.

## Tool Registry

Runtime v2 tools are registered through plugins in `lib/agent/runtime-v2/plugins/` and exposed by `lib/agent/runtime-v2/tools/registry.ts`.

Each tool declares:

- `name`
- `displayName`
- `description`
- `inputSchema`
- `sideEffect`
- `approvalPolicy`
- `handler`
- `displayFormatter`

Current plugin groups:

| Plugin | Implemented tools |
| --- | --- |
| `script` | `generate_script_package`, `critique_script`, `update_script_lab` |
| `workspace` | `update_creative_brief`, `create_project_artifact`, `update_project_status`, `update_shoot_pack` |
| `assets` | `generate_prompt_json`, `generate_media_asset`, `create_asset_folder`, `move_asset_to_folder`, `attach_asset_to_project` |
| `editor` | `import_asset_to_editor` |
| `instagram` | `prepare_instagram_post`, `publish_to_instagram` |

`publish_to_instagram` and `import_asset_to_editor` are registered as harness-facing tools but their handlers currently throw `Not implemented`. They exist so approval and planning behavior can be represented before the final integration lands.

## Streaming Contract

Tool event types and statuses are defined in `lib/agent/runtime-v2/events.ts`.

Tool status lifecycle:

1. `planned`
2. `running`
3. `completed`
4. `failed`
5. `awaiting_approval`
6. `approved`
7. `rejected`
8. `awaiting_input`

Execution workflows must stream Tool Call events before the final `chunk` response claims that a workspace update happened. A final response should only claim completed work when the matching `tool_completed` event was emitted.

The UI consumer is `components/agent/agent-chat-island.tsx`. Tool presentation is handled by `components/agent/tool-call-card.tsx` and approval actions by `components/agent/approval-card.tsx`.

## Approval Rules

Approval policy values are declared in `lib/agent/runtime-v2/tools/types.ts`:

| Policy | Meaning |
| --- | --- |
| `auto` | Runs immediately when the target and intent are clear. |
| `ask_if_overwrite` | Runs when safe, but pauses for overwrites or sensitive writes. |
| `always` | Always pauses before execution. |

The route-level approval guard is in `shouldRequireRuntimeV2Approval` inside `app/api/projects/[id]/agent/route.ts`.

Current high-risk cases:

- overwriting an existing finalized script
- publish actions
- editor writes that may overwrite or mutate timeline state
- destructive asset/folder actions when added later

## Verification

Automated coverage is concentrated in:

- `tests/unit/agent-mode-selector.test.ts`
- `tests/unit/agent-runtime-v2-planner.test.ts`
- `tests/unit/agent-runtime-v2-registry.test.ts`
- `tests/unit/agent-runtime-v2.test.ts`
- `tests/unit/agent-tools.test.ts`
- `tests/unit/agent-components.test.ts`

Manual QA is tracked in `docs/agent-runtime-v2-qa.md`.

Recommended verification for harness changes:

```bash
npm run typecheck
npm test -- tests/unit/agent-mode-selector.test.ts tests/unit/agent-runtime-v2-planner.test.ts tests/unit/agent-runtime-v2-registry.test.ts tests/unit/agent-runtime-v2.test.ts tests/unit/agent-tools.test.ts tests/unit/agent-components.test.ts
```

Run `npm run lint` and `npm run build` before shipping broader route or UI changes.
