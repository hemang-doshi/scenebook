# Phase 9: Workflow-Aware Agent UI

Phase 9 makes runtime-v4 workflow output visible and reviewable in the agent experience. Earlier phases made workflows, ProjectPatch planning, patch persistence, apply endpoints, and timeline hydration durable. Phase 9 connects those backend artifacts to a UI contract without removing the legacy stream surface that existing clients still depend on.

## Why Phase 9 Exists

Runtime-v4 can now produce structured workflow events, planned patches, artifacts, and approval states. A plain chat transcript hides too much of that work: users need to see what workflow ran, which artifacts were created, what patch is waiting, and whether applying it is safe.

The Phase 9 UI therefore treats the agent stream and hydrated history as a workflow timeline instead of only a message list. It keeps chat available, but makes backend workflow state inspectable.

## Timeline Entry Model

Timeline entries are normalized UI records derived from:

- live runtime stream packets
- hydrated runtime-v4 events
- persisted planned patches
- project artifacts
- assistant messages and run metadata

The model should preserve these distinctions:

- assistant text is a conversational response
- workflow events describe runtime progress
- artifacts are inspectable outputs
- patches are proposed workspace changes
- approvals represent a blocked or waiting state

This avoids flattening every backend event into generic text and lets the UI render workflow cards, artifact previews, and patch review controls with stable identifiers.

## Workflow Cards

Workflow cards summarize runtime-v4 workflow execution. They should show the workflow name, status, user-facing message, and any linked artifact or patch references.

The important workflow states are:

- `workflow_started`
- `workflow_completed`
- `workflow_failed`
- `workflow_needs_input`
- `workflow_patch_planned`
- `workflow_artifact_created`

Cards should not imply that external publishing, direct media generation, or third-party auth happened. Those remain out of scope for Phase 9.

## Artifact Previews

Runtime-v4 workflows can create project artifacts such as production packages, asset prompt packs, publish prep, and review outputs. Phase 9 previews should expose enough metadata and content for users to inspect the result before taking follow-up action.

Artifact previews should be read-only unless routed through an existing workspace operation or ProjectPatch flow. The UI may link to stored artifacts, but it should not invent a direct publishing or media-generation path.

## Patch Review And Apply Flow

ProjectPatch remains the only runtime-v4 path for grouped workspace writes. Phase 9 surfaces planned patches and lets the user review:

- patch title and summary
- risk level
- operation count and operation types
- approval requirement
- apply eligibility
- operation-level results after apply

Patch application must go through the existing apply endpoint and backend validation. The UI must not execute client-supplied patch JSON locally and must not bypass the persisted planned patch record.

## Event Streaming Compatibility

Runtime-v4 streams preserve the legacy event packets used by runtime-v3-era clients, including events such as `tool_running`, `tool_completed`, `approval_required`, `message_delta`, and `run_completed`.

In addition, every emitted runtime-v4 event is also sent as:

```json
{
  "type": "v4_event",
  "event": {
    "type": "workflow_completed"
  }
}
```

The raw `event` payload is the original `RuntimeV4Event`. This lets the Phase 9 UI render workflow-aware entries without breaking older consumers that only understand the mapped legacy packets.

For LangGraph orchestration, runtime-v4 events are emitted after the graph returns its collected event list. Live node-level callbacks remain a future optimization unless they can be added without a deep graph rewrite. The compatibility requirement is that collected runtime-v4 events are durably emitted as both raw `v4_event` packets and legacy mapped packets.

## Nango Remains Deferred

Phase 9 does not add Nango, Google auth changes, external publishing, direct media generation, ToolLoopAgent, or runtime-v3 removal.

Nango remains deferred because this phase is about making existing runtime-v4 workflow state visible and reviewable. Adding third-party connection management would expand the trust, auth, and publishing surface before the workflow timeline and patch review contract are stable.
