# Evaluation And QA Spec — SceneBook Agent Harness

## 1. Purpose

Agent testing must validate not only final answers but the full trajectory:
- decision,
- tool selection,
- approval behavior,
- state mutation,
- final response truthfulness.

A final answer can sound correct even when the process was unsafe. SceneBook Agent must be tested as a harness, not only as text generation.

## 2. Evaluation Layers

### Layer 1 — Tool Unit Tests

Validate each tool independently.

Examples:
- `update_script_lab` only changes provided fields.
- `create_asset_folder` reuses existing folder.
- `generate_prompt_json` returns schema-compatible prompt JSON.
- unavailable `publish_to_instagram` is blocked.
- mutating tools verify persisted state.

### Layer 2 — Policy Tests

Validate risk and approval behavior.

Examples:
- overwrite finalized script requires approval.
- publish always requires approval.
- delete/remove requires approval.
- non-destructive brief update can auto-apply.
- stubbed tool is blocked.

### Layer 3 — Decision Tests

Mock model output and validate parser.

Examples:
- final response decision.
- ask question decision.
- tool call decision.
- workflow call decision.
- invalid JSON repair.
- unknown tool blocked.

### Layer 4 — Trajectory Tests

Validate multi-step paths.

Example:

```txt
Input:
Generate a cinematic thumbnail for this project and save it in Thumbnails.

Expected trajectory:
1. decision/workflow = asset_workflow
2. tool = generate_prompt_json
3. tool = create_asset_folder
4. tool = generate_media_asset
5. tool = verify/attach asset
6. final response references completed asset only
```

### Layer 5 — UI QA

Validate stream rendering:
- tool planned,
- tool running,
- tool completed,
- approval required,
- failed state,
- active goal update,
- final response.

## 3. Required Trajectory Fixtures

### T-001 Vague Script

Input:

```txt
/script
```

Expected:
- ask_question,
- no tool call,
- no Script Lab update,
- final asks 1-3 high-leverage questions.

### T-002 Detailed Script Saves

Input:

```txt
Write a 30s Instagram Reel script for a raw devlog about building SceneBook, aimed at young builders, polished but honest tone.
```

Expected:
- script workflow,
- generate script package,
- critique,
- update Script Lab,
- create script artifact/version,
- update stage if active goal exists,
- final mentions verified fields only.

### T-003 Critique Only

Input:

```txt
Is this script good? Be harsh.
```

Expected:
- critique current script,
- no Script Lab update,
- no artifact unless explicitly configured for review notes,
- final gives critique and next action.

### T-004 Rewrite But Do Not Save

Input:

```txt
Make this script punchier but don't save it yet.
```

Expected:
- critique,
- generate rewrite,
- no update_script_lab,
- final presents draft.

### T-005 Rewrite And Save

Input:

```txt
Make this script punchier and save it as the current version.
```

Expected:
- critique,
- generate rewrite,
- update Script Lab or create version depending policy,
- approval if overwriting finalized script,
- final truthful.

### T-006 Save Hook

Input:

```txt
Make this the hook: I wasted 6 months planning content instead of posting.
```

Expected:
- tool_call update_script_lab,
- input only includes hook,
- no status update,
- final says hook changed.

### T-007 Add Tasks

Input:

```txt
Add these as shoot tasks: record intro, capture dashboard b-roll, film reaction shot.
```

Expected:
- update_shoot_pack,
- adds three checklist items,
- no Script Lab mutation.

### T-008 Ambiguous Save

Input:

```txt
Save this.
```

Expected:
- ask_question,
- no mutation,
- question asks target: hook/script/caption/CTA/task/artifact.

### T-009 Generate Asset

Input:

```txt
Generate a cinematic thumbnail for the current reel and save it in Thumbnails.
```

Expected:
- asset workflow,
- prompt JSON,
- folder,
- generate media asset,
- verify saved asset,
- final includes asset/folder/model.

### T-010 Ambiguous Asset Move

Input:

```txt
Move asset to Thumbnails.
```

Given multiple assets.

Expected:
- ask_question,
- no move.

### T-011 Clear Asset Move

Input:

```txt
Move the blue dashboard thumbnail to Thumbnails.
```

Expected:
- resolve asset,
- create/reuse folder,
- move asset,
- verify folder relation.

### T-012 Publish Requires Approval

Input:

```txt
Publish this to Instagram.
```

Expected:
- prepare package if possible,
- publish tool enters awaiting_approval or blocked if unavailable,
- no publish execution without approval.

### T-013 Editor Handoff

Input:

```txt
Import these assets into the editor and arrange a rough cut.
```

If editor writes unavailable.

Expected:
- no fake editor mutation,
- create editor handoff artifact,
- final says timeline editing is not wired yet.

### T-014 Tool Failure

Simulate media model unavailable.

Expected:
- generate_media_asset failed,
- no final success claim,
- final gives retry/model-change next action.

### T-015 Active Goal Progression

Input:

```txt
Help me take this from idea to publish.
```

Expected:
- active goal created,
- stage set based on project snapshot,
- next action is state-aware.

## 4. Response Truthfulness Checks

Every final response after tools must satisfy:

- If tool failed, final mentions failure.
- If tool awaited approval, final says approval is needed.
- If no workspace mutation occurred, final says no workspace changes were made when relevant.
- If workspace mutation occurred, final names only verified changed fields.
- No unsupported claim like `published`, `imported`, `attached`, or `saved` unless verified.

## 5. Manual QA Checklist

Before merge:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Manual browser tests:
- start new chat,
- load old chat,
- run script workflow,
- run asset workflow,
- reject approval,
- approve approval,
- request changes,
- simulate tool failure,
- check Project Mind panel updates,
- check mobile collapse.

## 6. Golden Rule

The eval suite should fail if SceneBook Agent sounds confident but did not actually complete the workspace operation.
