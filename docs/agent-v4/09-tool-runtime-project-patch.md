# Tool Runtime And ProjectPatch

Agent Runtime v4 separates model decisions from workspace writes. The model can propose a `tool_call` for one focused action or a `project_patch` for a grouped set of durable workspace updates, but execution still goes through typed tools, policy, verification, and trace events.

## Why Both Exist

`tool_call` is the small path. It is best for one direct action, such as updating Script Lab or recording one memory. The graph calls the typed tool executor, receives a verified result, and converts it into the legacy `ToolObservation` shape used by summaries and goal checks.

`project_patch` is the grouped mutation path. It lets the agent say, "save this brief change, active goal, script version, and memory together" without exposing arbitrary database writes. A ProjectPatch contains domain-specific operations, a risk level, an approval flag, and a summary the UI can show before or during execution.

The initial ProjectPatch operation set is:

- `update_creative_brief`
- `update_active_goal`
- `create_script_version`
- `update_script_lab`
- `update_shoot_pack`
- `create_project_artifact`
- `record_project_memory`

Each operation maps one-to-one to a runtime-v4 workspace tool. The patch executor validates the patch, applies operations in order, stops on failure or approval, and returns operation-level details.

## Policy And Approval

Policy is owned by the typed tool runtime. ProjectPatch does not bypass it; every operation is still a tool execution with its own availability, ownership, side-effect, and approval checks.

Patch-level `requiresApproval` and blocked risk are treated as approval placeholders. The executor returns `awaiting_approval` without applying operations. Operation-level approval returned by a tool also stops the patch and returns `awaiting_approval`.

## Verification

Mutating tools verify persistence before reporting success. Patch results preserve each tool result, including verification data. Runtime-v4 emits patch lifecycle events and tool verification events so the UI and trace can distinguish:

- planned patches,
- running operations,
- completed operations,
- verification failures,
- partial failures,
- approval waits.

The final response must only claim completed work when the patch status is `completed`. `partial_failed`, `failed`, and `awaiting_approval` are not success states.

## Partial Failure

ProjectPatch applies operations in order. If an operation fails after earlier operations completed, the patch returns `partial_failed`, includes successful and failed counts, and marks retryability from the underlying tool errors. This keeps the trace honest: completed operations remain durable, while failed operations are explicit recovery work.

## Events And Legacy Stream

Runtime-v4 patch events map to the existing chat stream contract:

- patch planning maps to `tool_planned`,
- patch applying and operation running map to `tool_running`,
- completed operations and patches map to `tool_completed`,
- failed or partial patches map to `tool_failed`,
- approval waits map to `approval_required`.

This lets the current UI keep working while future UI cards render richer patch previews and operation rows.

## Nango Readiness

ProjectPatch is ready for Nango-backed tools because external actions remain typed tools with policy and verification. Nango adapters can later provide availability, connection state, and provider execution behind the same tool contract. The model never receives raw OAuth tokens, and external side effects can require approval before exact tool inputs are executed.
