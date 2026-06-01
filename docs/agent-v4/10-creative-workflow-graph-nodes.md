# Agent v4 Creative Workflow Graph Nodes

Phase 8 adds v4-native creative workflows so Agent Runtime v4 can behave like a short-form video production partner, not only a verified single-tool executor.

## Why Workflows Exist

Creative requests often need multiple coordinated outputs: an angle, hooks, a script, a shoot pack, asset prompts, critique, captions, and durable workspace saves. A `tool_call` is still best for one verified action. A `project_patch` is best when the model already knows the exact durable workspace operations to apply. A `workflow_call` is best when the agent should synthesize creative output first, then optionally produce a `ProjectPatch`.

## Workflow Names

Runtime v4 workflows are:

- `plan_reel`
- `create_script_package`
- `create_shoot_pack`
- `create_asset_prompt_pack`
- `review_content`
- `prepare_publish_package`

The decision prompt now steers model decisions toward these names instead of the older runtime-v3 workflow names.

## ProjectMind

Workflows receive the full `ProjectMindSnapshot` and the compact model-facing ProjectMind. They use existing creative brief, active goal, Script Lab, shoot pack, selected/rejected outputs, assets, memories, readiness, and recent run summaries to adapt outputs to the current project state.

## Model Gateway

Workflows use the runtime-v4 model gateway boundary from `lib/agent/runtime-v4/model.ts`. They do not import provider SDKs directly. This keeps workflows testable with fake gateways and preserves model routing through the AI SDK gateway.

## ProjectPatch

Workflows do not mutate workspace state directly. Durable saves are represented as `ProjectPatch` operations such as `update_creative_brief`, `create_script_version`, `update_script_lab`, `update_shoot_pack`, `create_project_artifact`, and `record_project_memory`.

The `WorkflowExecutor` can apply a returned patch through the Phase 7 `PatchExecutor` when configured to do so. Otherwise it returns the creative output and a planned patch preview.

## Graph Behavior

`workflow_call` decisions now execute through the v4 workflow executor instead of falling into the missing-executor stub. The graph records workflow lifecycle events:

- `workflow_started`
- `workflow_completed`
- `workflow_failed`
- `workflow_needs_input`
- `workflow_patch_planned`
- `workflow_artifact_created`

These map to legacy tool-style events so the current UI remains compatible.

## No External Publishing

Phase 8 intentionally does not add Nango, Google auth, direct media generation, or external publishing. `prepare_publish_package` creates captions, hashtags, thumbnail text, descriptions, and posting checklists only.

## Expected User Behavior

When the user says, "Help me make a reel about building SceneBook," the agent should choose `plan_reel`, produce a creative direction and production plan, then plan durable saves for the creative brief, active goal, and memory. Follow-up requests can call script, shoot pack, asset prompt, review, and publish prep workflows.
