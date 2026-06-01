# Phase 8.5: Model-Backed Workflow Quality

Phase 8 introduced runtime-v4 creative workflows and wired `workflow_call` decisions into the graph. That made workflows durable, but most outputs were still deterministic scaffolds. Phase 8.5 makes the workflow layer adaptive enough to behave like a production assistant while preserving the safety constraints from the ProjectPatch system.

## Goals

- Ground every creative workflow in ProjectMind.
- Use structured model generation for workflow outputs.
- Keep deterministic fallbacks for offline, malformed, or unavailable models.
- Add `create_full_production_package` for end-to-end reel preparation.
- Prevent large or unsafe model-generated patches from auto-applying.
- Keep external integrations, auth, UI redesign, publishing, and media generation out of scope.

## Structured Generation

Each workflow now uses `generateWorkflowStructured`. The helper receives:

- a workflow name
- a Zod output schema
- workflow-specific system and user prompts
- the workflow `CreativeWorkflowContext`
- a deterministic fallback function

When `context.modelGateway` exists, the workflow asks the gateway for validated structured output. If the gateway is missing, fails, or returns invalid data, the workflow returns fallback output instead of surfacing raw JSON or schema errors to the user.

Central schemas live in:

- `lib/agent/runtime-v4/workflows/workflow-schemas.ts`

The shared model helper lives in:

- `lib/agent/runtime-v4/workflows/workflow-model.ts`

## ProjectMind Grounding

Prompts are built with shared prompt builders from:

- `lib/agent/runtime-v4/workflows/prompt-builders.ts`

Every model-backed workflow prompt includes the project, creative brief, script state, shoot pack state, selected/rejected outputs, durable memories, readiness, integration state, and the user prompt. This keeps outputs specific to the current project instead of defaulting to hardcoded launch-reel copy.

## Fallbacks

Fallbacks live in:

- `lib/agent/runtime-v4/workflows/workflow-fallbacks.ts`

They are intentionally deterministic and project-aware. They use the current project title, creative brief, platform, format, tone, and readiness whenever available. This gives tests and local development stable behavior while still avoiding SceneBook-launch-specific output for arbitrary projects.

## Full Production Package

The new workflow is:

- `create_full_production_package`

It coordinates the same bounded creative stages in one call:

- plan
- script package
- shoot pack
- asset prompt pack
- publish prep

It returns one ProjectPatch with operations for the creative brief, active goal, script version, Script Lab, shoot pack, full production artifact, asset prompt artifact, publish package artifact, and project memory.

The workflow still does not generate media, publish externally, call Nango, or write outside the ProjectPatch system.

## Auto-Apply Safety

Workflow patches only auto-apply when all of these are true:

- `riskLevel` is `low`
- `requiresApproval` is `false`
- every operation is a known workspace operation
- operation count is at or below the safe threshold
- the patch does not include external publishing or destructive intent

Large packages, including the full production package, remain planned but are not auto-applied by default.

## Needs Input

Creative missing-context is no longer represented as approval. Workflow `needs_input` results produce a blocked creative observation with:

- `output.kind = "creative_workflow_needs_input"`

The graph can still turn that into `ask_question`, but internal analytics and tool history no longer confuse missing creative information with approval.

## Still Deferred

Phase 8.5 intentionally does not add:

- Nango
- Google auth changes
- external publishing
- direct media generation
- UI redesign
- AI SDK ToolLoopAgent
- runtime-v3 removal
