# Agent Harness Current Implementation Analysis

Fresh pull status: `codex/agent-runtime-v2` is up to date with `origin/codex/agent-runtime-v2` at `0088f5c`.

This analysis captures what the pulled branch already implements and what should be treated as follow-up work in a new feature branch.

## Implemented In This Branch

| Area | Current implementation | Evidence |
| --- | --- | --- |
| Runtime v2 flag | `AGENT_RUNTIME_V2_ENABLED=true` switches the project agent route into Runtime v2 behavior. | `app/api/projects/[id]/agent/route.ts`, `README.md` |
| Mode selection | Keyword and context-based routing across brainstorm, plan, goal, execute, review, and ask modes. | `lib/agent/runtime-v2/mode-selector.ts`, `tests/unit/agent-mode-selector.test.ts` |
| Planning | Converts mode/workflow context into questions, tool steps, creative options, or structured plans. | `lib/agent/runtime-v2/planner.ts`, `tests/unit/agent-runtime-v2-planner.test.ts` |
| Script workflow | Generates a script package, critiques it, updates Script Lab, creates an artifact, and advances status when safe. | `lib/agent/runtime-v2/plugins/script-plugin.ts`, `app/api/projects/[id]/agent/route.ts`, `tests/unit/agent-tools.test.ts` |
| Goal mode | Creates or updates an Active Goal and advances stages such as scripting, asset planning, publishing, and analysis. | `lib/agent/runtime-v2/goals.ts`, `tests/unit/agent-tools.test.ts` |
| Asset workflow | Builds prompt JSON, generates media, creates folders, moves assets, and attaches project assets. | `lib/agent/runtime-v2/plugins/assets-plugin.ts`, `lib/agent/runtime-v2/asset-intent.ts`, `tests/unit/agent-tools.test.ts` |
| Review mode | Supports critique-only, critique-and-rewrite, and save/update paths. | `lib/agent/runtime-v2/reflection.ts`, `app/api/projects/[id]/agent/route.ts`, `tests/unit/agent-tools.test.ts` |
| Natural-language workspace control | Handles clear requests such as CTA updates, task updates, status updates, folder creation, and ambiguous asset moves. | `lib/agent/runtime-v2/mode-selector.ts`, `lib/agent/runtime-v2/plugins/workspace-plugin.ts`, `tests/unit/agent-tools.test.ts` |
| Tool events | Emits planned, running, completed, failed, awaiting approval, approved, rejected, and awaiting input statuses. | `lib/agent/runtime-v2/events.ts`, route stream helpers |
| Approval gating | Blocks publish actions and finalized script overwrites behind approval. | `shouldRequireRuntimeV2Approval` in `app/api/projects/[id]/agent/route.ts`, `tests/unit/agent-tools.test.ts` |
| UI rendering | Agent chat consumes streamed events and shows Tool Call / approval card state. | `components/agent/agent-chat-island.tsx`, `components/agent/tool-call-card.tsx`, `components/agent/approval-card.tsx` |

## Harness Invariants

These invariants should hold for any follow-up implementation:

1. Execution workflows emit `plan` and Tool Call events before the final response claims workspace changes.
2. A workspace mutation is only claimed after the relevant tool reaches `completed`.
3. Failed tools emit a failed Tool Call state and the final response does not claim success.
4. Ambiguous requests ask one or more clarifying questions instead of guessing targets.
5. Approval-required tools persist `awaiting_approval` and do not execute handlers before approval.
6. Plan and brainstorm modes do not create Tool Calls.
7. Goal-mode responses include current goal, current stage, what changed, and next suggested action.

## Gaps For The Next Feature Branch

These items are visible in the current implementation and should be handled separately from this documentation pass:

1. **Case-sensitive docs cleanup:** The repository tracks both `Docs/agent-runtime-v2.md` and `docs/agent-runtime-v2.md`. On a case-insensitive macOS checkout, this creates a persistent dirty state because both paths collapse to one directory.
2. **Editor integration:** `import_asset_to_editor` is registered but not implemented.
3. **Instagram publish integration:** `publish_to_instagram` is registered and approval-gated but not implemented.
4. **Tool runner reuse:** The route contains separate local `runTool` helpers for script, asset, review, and workspace-control streams. A shared helper may reduce drift, but should only be extracted with regression coverage because event ordering and failure semantics are critical.
5. **Creative Brief persistence consistency:** The schema supports `project_creative_briefs`, while the current workspace plugin records brief updates through Script Lab notes. The next branch should decide whether the tool should write the dedicated brief table directly.
6. **Manual signed-in QA:** Automated unit coverage is broad, but signed-in browser QA for the full Runtime v2 project flow still needs a real authenticated session.

## Recommended Fresh Feature Branch Scope

The next branch should stay narrow. The highest-leverage follow-up is:

1. Resolve the `Docs/` versus `docs/` collision without losing either document's useful content.
2. Extract one shared Runtime v2 tool runner only if tests can lock event order, approval gating, and failure behavior.
3. Implement either editor import or Instagram publish, not both in the same branch.

Suggested branch name:

```bash
codex/agent-harness-followup
```
