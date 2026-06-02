# Runtime v4 Manual Smoke Tests

Use this checklist for Phase 9.5 UI/runtime hardening after the local app is running and seeded with a project the signed-in developer can edit. The smoke path should exercise runtime-v4 workflow cards, planned patches, patch apply, ProjectMind refresh, artifact previews, and tool card behavior without covering external auth, publishing, or media generation.

## Setup

- Work on branch `agent-v4/phase-09-5-ui-runtime-hardening`.
- Start the app with the normal local development command for this repo.
- Sign in as a developer user with access to a test project.
- Open the project workspace that includes the agent chat, ProjectMind panel, timeline, and artifact/patch surfaces.
- Use a project with enough brief context to make a production package meaningful. If needed, add a short title, platform, audience, format, and viewer promise before starting the smoke.

## Checklist

### 1. Generate Full Production Package

Prompt the project agent:

```text
Make the complete production package for this project.
```

Expected:

- The run completes without navigating away from the project.
- The assistant does not claim that publishing, external auth, or media generation happened.
- The response or timeline references a complete production package.

### 2. See Workflow Card

Expected:

- A workflow card appears in the timeline for `Create full production package` or the equivalent runtime-v4 production package workflow.
- The card shows a non-error terminal state after completion.
- The card includes a useful summary and links or references to generated artifacts and the planned patch.

### 3. See Planned Patch

Expected:

- A planned patch preview appears for `Save full production package`.
- The preview shows the patch title, summary, risk or approval state, operation count, and operation rows.
- The patch is not silently applied before the developer chooses to apply it.

### 4. Apply Patch

Click the patch apply action.

Expected:

- The UI calls the planned patch apply flow and keeps the developer on the same project.
- The patch transitions out of the planned state.
- The final patch state is `completed` for the happy path, or a clear failed/partial/approval state if the backend rejects an operation.

### 5. Operation Statuses Update

Expected:

- Operation rows update progressively while the patch is applying.
- Completed operations stay completed and do not regress when later operation events arrive.
- Any failed operation shows its failed state and reason instead of being hidden by the patch summary.

### 6. ProjectMind Refreshes

Expected:

- After a successful apply, the ProjectMind panel refreshes to reflect the newly saved production state.
- The refreshed ProjectMind content matches the applied patch outcome, such as updated brief/script/shoot-pack/artifact memory.
- Reloading the project keeps the applied state visible.

### 7. Artifact Preview Renders

Open the generated production package artifact preview.

Expected:

- The artifact preview renders readable production package content.
- Core sections are visible, including plan, script, shoot, assets, and publish-prep/readiness content when present.
- The preview is read-only and does not expose a direct publishing or media-generation action.

### 8. Tool Cards Stay Collapsed

Run or inspect a successful agent turn that emits tool activity.

Expected:

- Successful tool cards remain collapsed by default.
- The timeline remains scannable after the production package run.
- Expanding a tool card manually shows details without changing the state of unrelated cards.

### 9. Failed Tool Expands

Trigger or replay a run with a known failed tool or failed patch operation.

Expected:

- The failed tool card expands automatically.
- The visible expanded content includes the failure message or reason.
- The assistant and timeline do not present the failed tool as a successful workspace change.

## Pass Criteria

This smoke passes when all checklist items above match the expected behavior in one local project session. Record any deviations with the project ID, run ID if available, prompt text, observed UI state, and whether the issue happened during live streaming, refresh hydration, or patch apply.
