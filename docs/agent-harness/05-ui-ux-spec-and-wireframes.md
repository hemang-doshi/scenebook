# UI/UX Spec And Wireframes — SceneBook Agent Harness

## 1. UX Goal

The agent UI should make SceneBook feel like an intelligent creative workspace, not a generic chat app.

The user should always understand:
- what the agent knows,
- what it is planning,
- what it changed,
- what needs approval,
- what the next best action is.

## 2. Core UX Principles

1. Keep chat central, but make workspace state visible.
2. Tool calls should feel like transparent operations, not hidden magic.
3. Approval should show risk and before/after clearly.
4. Active Goal should act like a project compass.
5. The agent should never bury important state in long text.
6. The UI should support creator flow: fast, visual, low-friction.

## 3. Main Layout

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Project: SceneBook Launch Reel                         Project Hub | Editor │
├───────────────┬───────────────────────────────────────────────┬──────────────┤
│ Threads       │ Agent Conversation                            │ Project Mind │
│               │                                               │              │
│ + New Chat    │ ┌───────────────────────────────────────────┐ │ Active Goal  │
│ Recent        │ │ User / Assistant messages                 │ │ Stage        │
│ Conversations │ │                                           │ │ Readiness    │
│               │ │ Plans                                     │ │ Brief        │
│ Models        │ │ Tool Cards                                │ │ Missing      │
│ Chat          │ │ Approval Cards                            │ │ Assets       │
│ Image         │ │ Final Summary                             │ │ Next Action  │
│ Video         │ └───────────────────────────────────────────┘ │              │
│ Audio         │                                               │              │
│               │ Composer                                      │              │
└───────────────┴───────────────────────────────────────────────┴──────────────┘
```

## 4. Left Sidebar

### Contents

- New conversation button.
- Recent threads.
- Active thread highlight.
- Model selector accordion.
- Optional runtime badge.

### Requirements

- Thread titles should be derived from user intent.
- User should be able to start a clean chat without losing project memory.
- Model selector should be compact.

## 5. Center Conversation

### Message Types

1. User message.
2. Assistant message.
3. Plan card.
4. Tool call card.
5. Approval card.
6. Goal update card.
7. Error card.

### Conversation Flow Example

```txt
User:
Generate a cinematic thumbnail for this reel.

Agent:
[Plan Card]
1. Create prompt JSON
2. Reuse or create Thumbnails folder
3. Generate image asset
4. Save and attach to project

[Tool: Generate Prompt JSON] completed
[Tool: Create Asset Folder] completed
[Tool: Generate Media Asset] running...
[Tool: Generate Media Asset] completed
[Tool: Verify Asset Saved] completed

Done: Thumbnail generated and saved.
What changed: Created asset "Cinematic thumbnail..." in Thumbnails.
Next: Review it or ask for 2 variations.
```

## 6. Right Panel — Project Mind

The right panel is the biggest UI upgrade. It turns the agent from chat into a project-aware operator.

### Sections

```txt
ACTIVE GOAL
Title: Take launch reel from idea to publish
Stage: Asset Planning
Completed: 3 steps
Next: Generate thumbnail

PROJECT READINESS
Brief: 80%
Script: 100%
Shoot Pack: 40%
Assets: 30%
Editor: 0%
Publish: 20%

CREATIVE BRIEF
Audience: tech creators
Tone: raw + polished
Platform: Instagram
Open questions: 1

MISSING / NEXT
- Thumbnail
- Screen recording shot list
- Publish caption package
```

### Requirements

- Must update after tool events.
- Must show `unknown` instead of guessing.
- Must not require user to read long chat to know project state.

## 7. Plan Card

### Purpose

Show the agent's intended steps before execution.

### Wireframe

```txt
┌──────────────────────────────────────────────┐
│ Plan                                         │
│ Reason: User requested asset generation       │
│                                              │
│ 1. Generate Prompt JSON      no side effect   │
│ 2. Create Folder             db write         │
│ 3. Generate Image            generation       │
│ 4. Verify Asset              read/check       │
│                                              │
│ Approval needed: No                          │
└──────────────────────────────────────────────┘
```

### States

- proposed,
- executing,
- paused for approval,
- completed,
- failed.

## 8. Tool Call Card

### Purpose

Make workspace actions transparent.

### Wireframe

```txt
┌──────────────────────────────────────────────┐
│ ✓ Update Script Lab                           │
│ Applied script fields to project workspace    │
│                                              │
│ Changed fields: hook, script, caption, CTA    │
│ Side effect: db_write                         │
│ Verified: yes                                 │
│                                              │
│ View details                                  │
└──────────────────────────────────────────────┘
```

### Required Fields

- tool display name,
- status,
- purpose,
- changed fields,
- side effect,
- approval policy,
- verification result,
- error message if failed,
- asset preview if media asset.

## 9. Approval Card

### Purpose

Prevent risky invisible actions.

### Wireframe

```txt
┌──────────────────────────────────────────────┐
│ Approval Required                             │
│ Action: Overwrite finalized Script Lab        │
│ Risk: Medium                                  │
│ Reason: Project is already ready_to_shoot     │
│                                              │
│ Before                                       │
│ Hook: Old hook...                             │
│                                              │
│ After                                        │
│ Hook: New hook...                             │
│                                              │
│ [Approve] [Request changes] [Reject]          │
└──────────────────────────────────────────────┘
```

### Requirements

- Show before/after for patchable workspace changes.
- Show exact tool and input in details.
- Reject must not execute.
- Request changes must resume cleanly.

## 10. Goal Card

### Wireframe

```txt
┌──────────────────────────────────────────────┐
│ Active Goal                                   │
│ Finish SceneBook Launch Reel                  │
│ Stage: Asset Planning                         │
│                                              │
│ Completed                                     │
│ ✓ Brief locked                                │
│ ✓ Script saved                                │
│                                              │
│ Next                                          │
│ → Generate thumbnail                          │
│ → Build editor handoff                        │
└──────────────────────────────────────────────┘
```

## 11. Empty State

The empty state should offer project-aware suggestions.

```txt
What do you want to do with this project?

[Brainstorm angles]
[Write script]
[Generate thumbnail]
[Build shoot pack]
[Prepare for Instagram]
[Take this from idea to publish]
```

Suggestions should depend on project readiness.

## 12. Composer

### Requirements

- Supports text.
- Supports slash command hints.
- Supports attachments if already wired.
- Shows active runtime/model.
- Shows "will require approval" hints for obvious risky actions.

### Composer Helper Examples

```txt
Try:
"Make this hook stronger and save as a new version"
"Generate a thumbnail in the Thumbnails folder"
"Help me take this from idea to publish"
"Prepare an editor handoff from the current script"
```

## 13. Asset Preview In Tool Cards

For media generation:

```txt
┌──────────────────────────────────────────────┐
│ ✓ Generate Media Asset                        │
│ Model: selected image model                   │
│ Folder: Thumbnails                            │
│                                              │
│ [image preview]                               │
│                                              │
│ Prompt: cinematic close-up...                 │
│ [Open Asset] [Generate variation]             │
└──────────────────────────────────────────────┘
```

## 14. Error UX

Failure must be actionable.

Bad:

```txt
Something went wrong.
```

Good:

```txt
Image generation failed because the selected model is unavailable.
No workspace changes were made.
Next: choose another image model or retry with default.
```

## 15. Mobile/Responsive

On smaller screens:
- right Project Mind panel collapses into a drawer,
- thread sidebar collapses,
- tool cards remain inline.

## 16. Design Direction

SceneBook Agent should feel focused, editorial, creative, operational, premium but not corporate.

Visual style:
- chat center,
- structured cards,
- subtle borders,
- compact mono labels,
- warm creative workspace feel,
- clear status colors.

## 17. Required UI Components

- `AgentShell`
- `ThreadSidebar`
- `ProjectMindPanel`
- `AgentConversation`
- `PlanCard`
- `ToolCallCard`
- `ApprovalCard`
- `GoalCard`
- `ReadinessMeter`
- `CreativeBriefSummary`
- `AgentComposer`
- `AssetPreviewCard`
- `RuntimeStatusBadge`

## 18. UX Acceptance Criteria

- User can understand what the agent did without reading raw JSON.
- User can approve/reject risky actions.
- User can see active goal and next action.
- User can see tool failures clearly.
- User can tell whether a workspace mutation happened.
- User can inspect details when needed.
