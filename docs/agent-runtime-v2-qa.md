# SceneBook Agent Runtime v2 QA Checklist

Use this checklist with `AGENT_RUNTIME_V2_ENABLED=true`. For each case, confirm the first stream event is the mode/plan event, Tool Call events appear before the final response, and the final response does not claim a Workspace Update unless a matching `tool_completed` event exists.

## Setup

- [ ] Start from a clean local branch.
- [ ] Set `AGENT_RUNTIME_V2_ENABLED=true` in `.env.local`.
- [ ] Sign in or use sample mode as appropriate for the environment.
- [ ] Open a project workspace with chat visible.
- [ ] Keep the browser console/network panel open for streaming event inspection.

## Test Cases

### Vague `/script` Asks Questions

- [ ] Send `/script`.
- [ ] Expected mode: `ask`.
- [ ] Expected behavior: SceneBook Agent asks 1-3 high-leverage creative questions.
- [ ] Expected Tool Calls: none.
- [ ] Pass condition: no Script Lab Workspace Update is claimed or performed.

### Detailed `/script` Saves To Script Lab

- [ ] Send a detailed script request with platform, duration, format, tone, and core angle.
- [ ] Expected mode: `execute`.
- [ ] Expected Tool Calls: script package generation, critique, Script Lab update, project artifact, status update as applicable.
- [ ] Pass condition: Script Lab fields update only after `update_script_lab` reaches `completed`.
- [ ] Pass condition: final response includes Done / status, What changed, Creative reasoning summary, and Next best action.

### Natural-Language Script Save Works

- [ ] Send a generated hook or paragraph, then say "make this my CTA" or "add this to script".
- [ ] Expected mode: `execute`.
- [ ] Expected Tool Calls: `update_script_lab`.
- [ ] Pass condition: only the requested Script Lab field changes.
- [ ] Pass condition: final response names only the completed Workspace Update.

### Goal Mode Creates Active Goal

- [ ] Send "Help me take this from idea to publish."
- [ ] Expected mode: `goal`.
- [ ] Expected behavior: an Active Goal is created or loaded.
- [ ] Pass condition: the response shows current goal, current stage, what changed, and next suggested action.
- [ ] Pass condition: Active Goal is visible in the agent UI.

### Asset Generation Saves And Organizes Asset

- [ ] Send a specific asset request such as "Generate a cinematic Instagram thumbnail for this project and save it in a Thumbnails folder."
- [ ] Expected mode: `execute`.
- [ ] Expected Tool Calls: `generate_prompt_json`, `create_asset_folder`, `generate_media_asset`, `attach_asset_to_project`.
- [ ] Pass condition: the folder exists, the generated asset is attached to the project, and the Tool Call card shows a preview when available.
- [ ] Pass condition: failures show a visible failed state with the error message.

### Approval Required For Publish

- [ ] Send "Prepare this for Instagram and publish it."
- [ ] Expected Tool Calls: `prepare_instagram_post` may complete automatically; `publish_to_instagram` must enter `awaiting_approval`.
- [ ] Pass condition: publishing does not run before approval.
- [ ] Click Reject.
- [ ] Pass condition: publish Tool Call becomes rejected and no publish claim is made.
- [ ] Repeat and click Approve.
- [ ] Pass condition: publish runs only after approval and final response follows the completed Tool Call.

### No False Workspace Claims

- [ ] Force or simulate a Tool Call failure, such as an unavailable media model.
- [ ] Expected Tool Call state: `failed`.
- [ ] Pass condition: the failed Tool Call card displays the failure.
- [ ] Pass condition: final response says the action failed or is blocked; it does not say the Workspace Update completed.

### Ambiguous Asset Move Asks A Question

- [ ] With multiple project assets, send "move asset to Thumbnails."
- [ ] Expected mode: `execute` or `ask`.
- [ ] Expected behavior: SceneBook Agent asks which asset should move.
- [ ] Pass condition: no `move_asset_to_folder` Tool Call completes until the target is clear.

### Clear Folder Creation Creates Folder

- [ ] Send "Create a folder called Thumbnails."
- [ ] Expected mode: `execute`.
- [ ] Expected Tool Calls: `create_asset_folder`.
- [ ] Pass condition: folder creation completes automatically and appears in the asset UI.

## Regression Checks

- [ ] Old runtime still works when `AGENT_RUNTIME_V2_ENABLED` is unset or not `true`.
- [ ] Approval cards show Approve, Reject, and Ask for changes.
- [ ] Tool Call status labels are readable for planned, running, completed, failed, awaiting approval, approved, rejected, and awaiting input.
- [ ] Product naming is consistent: SceneBook Agent, Creative Brief, Active Goal, Tool Call, Workspace Update.
- [ ] No final response appears before planned/running/completed Tool Call events for an execution workflow.

## Automated Verification

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
