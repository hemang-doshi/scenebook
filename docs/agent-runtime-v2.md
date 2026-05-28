# SceneBook Agent Runtime v2

SceneBook Agent Runtime v2 powers the creative producer and workspace operator behavior in the project chat. It is gated by `AGENT_RUNTIME_V2_ENABLED` so the legacy runtime can remain available while v2 stabilizes.

## Enabling Runtime v2

Set the flag in `.env.local`:

```bash
AGENT_RUNTIME_V2_ENABLED=true
```

When the flag is not `true`, the agent route uses the existing fallback runtime paths. Keep the fallback in place until Runtime v2 is fully stable in production.

## Agent Modes

Runtime v2 starts by selecting an agent mode from the user's message, slash-command hint, Creative Brief, Active Goal, and recent project context.

| Mode | Purpose | Typical trigger | Tool behavior |
| --- | --- | --- | --- |
| `brainstorm` | Generate creative options before execution. | "ideas", "hooks", "brainstorm", "not sure" | No Workspace Update unless the user asks to save/update. |
| `plan` | Structure a production or campaign plan. | "plan", "strategy", "outline", "roadmap" | No premature Tool Call claims. |
| `goal` | Create or advance an Active Goal across the project lifecycle. | "end-to-end", "idea to publish", "finish this project" | Creates or updates goal tracking state. |
| `execute` | Act on the workspace when intent is clear. | "write", "generate", "save", "update", natural-language workspace control | Runs visible Tool Calls. |
| `review` | Critique scripts, hooks, captions, content ideas, shot lists, and generated asset metadata like a creative producer. | "is this good?", "critique", "review", "make it better" | Critiques only unless a rewrite/save/update is clearly requested. |
| `ask` | Ask high-leverage clarification questions. | Vague `/script` or missing required workflow fields | No Tool Call until enough direction exists. |

Slash commands are workflow hints, not rigid commands. Natural-language requests can select the same workflows and tools.

## Goal Mode

Goal mode creates or updates an **Active Goal** for end-to-end creative work. Active Goal stages are:

- `ideating`
- `briefing`
- `scripting`
- `asset_planning`
- `generating_assets`
- `editing`
- `publishing`
- `analyzing`
- `complete`

The final response for goal mode reports the current goal, current stage, what changed, and the next suggested action.

## Creative Brief

The **Creative Brief** is the structured creative context used by planners and workflows. It may include platform, duration, tone, format, creator presence, CTA, content goal, core angle, and viewer emotion.

Runtime v2 extracts Creative Brief fields from user text and merges useful structured work into the project when the relevant Workspace Update tool completes. Vague creative requests should produce only a small number of high-leverage questions.

## Workflows

Runtime v2 currently defines these workflows:

| Workflow | Purpose | Required fields | Default Tool Calls |
| --- | --- | --- | --- |
| `script` | Turn a resolved Creative Brief into a drafted, critiqued, workspace-ready script package. | `coreAngle`, `platform`, `durationSeconds`, `format`, `tone` | `generate_script_package`, `critique_script`, `update_script_lab`, `create_project_artifact`, `update_project_status` |
| `asset_generation` | Convert creative direction into prompt JSON, generated media, and an attached project asset. | `modality`, `promptOrCreativeDirection`, `projectFormat` | `generate_prompt_json`, `create_asset_folder`, `generate_media_asset`, `attach_asset_to_project` |

Review mode can run a critique-only path, a critique-and-rewrite path, or a critique-rewrite-save path. Saving an improved version should create a project artifact/version and must not overwrite Script Lab unless the user clearly asked to save or update.

## Plugins

Plugins group tools by workspace capability:

| Plugin | Capabilities |
| --- | --- |
| `script` | Script generation, critique, and Script Lab updates. |
| `workspace` | Creative Brief, artifact, project status, and shoot-pack Workspace Updates. |
| `assets` | Prompt JSON, media generation, asset folders, asset moves, and project asset attachment. |
| `editor` | Editor import and composition operations. |
| `instagram` | Instagram post preparation and publishing. Available for Instagram projects. |

## Tool Calls

Every workspace-changing action must appear as a visible **Tool Call** in the chat UI. Runtime v2 emits tool events in this lifecycle:

- `planned`
- `running`
- `completed`
- `failed`
- `awaiting_approval`
- `approved`
- `rejected`
- `awaiting_input`

Tool Call cards should show the display name, purpose, status, changed workspace fields, output summary, asset preview when available, and an error message for failed tools.

Final responses must not claim a Tool Call completed unless the corresponding `tool_completed` event exists. Streaming order should be:

1. mode or plan event
2. Tool Call events
3. final response chunk

## Approval Policies

Runtime v2 tools declare an approval policy:

| Policy | Meaning |
| --- | --- |
| `auto` | Runs without confirmation when intent and target are clear. |
| `ask_if_overwrite` | Runs automatically when safe, but requests approval for overwrites or destructive/editor-sensitive changes. |
| `always` | Always requests approval before running. |

Auto-apply examples:

- `update_creative_brief`
- `update_script_lab` when not overwriting a finalized script
- `create_project_artifact`
- `create_asset_folder`
- `attach_asset_to_project`
- `update_shoot_pack`
- `prepare_instagram_post`

Approval-required examples:

- overwriting an existing finalized script
- deleting an asset or folder
- publishing to Instagram
- exporting final video
- destructive editor changes

The approval UI supports Approve, Reject, and Ask for changes. Approval-required tools must not execute until the user approves the pending Tool Call.

## Natural-Language Workspace Control

Runtime v2 can operate the workspace without slash commands when the target is clear:

- "save this"
- "add this to script"
- "make this the hook"
- "use this as CTA"
- "add these as tasks"
- "mark ready to shoot"
- "create a folder"
- "move asset"
- "organize assets"
- "prepare for Instagram"

If the target is ambiguous, SceneBook Agent should ask a clarifying question such as "Which asset should I move to Thumbnails?" instead of guessing.

## Response Shape

When tools ran, the final response should follow this structure:

1. Done / status
2. What changed
3. Creative reasoning summary
4. Next best action

Brainstorm responses should include 3-5 strong options, an opinionated recommendation, and one high-leverage question. Plan responses should include creative direction, stages, and the next decision without premature Tool Call claims.
