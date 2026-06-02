# Codex Implementation Brief — SceneBook Brand System

You are implementing the SceneBook UI revamp using the provided brand pack.

## Source of truth

Use the design files in this package, especially:

- `design.md`
- `brand-pack.md`
- `motion-pack.md`
- `tokens/scenebook.tokens.css`
- `tokens/scenebook.motion.css`

Do not invent a new palette, theme, or motion language. The source design is final.

## Primary objective

Turn SceneBook from a tab-heavy creator workspace into a dark-first AI production workspace for short-form video creation. The agent chat must feel like the primary creation surface, while workflow packages, planned ProjectPatch outputs, timeline receipts, and asset/editor handoff become first-class UI objects.

## Brand direction

- Dark-first product shell: `#07080b` background, `#141821` panels, `#fffdf8` document/review surfaces.
- Accent system: `#ff6847` creative/cue coral, `#69a7ff` runtime/system blue, `#b8ff6a` applied/success, `#a78bfa` model selection.
- Typography: large tight display headings; restrained body copy; mono uppercase labels for runtime state.
- Use thin borders, rounded media/product cards, minimal shadows, pill controls, and generous whitespace.
- Avoid generic SaaS gradients, heavy shadows, childish rounded cards, and corporate dashboard clutter.
- Remove workspace breadcrumbs; keep the primary nav centered and use active project labels for orientation.
- Global actions belong in an elastic left rail (`56px` collapsed, `248px` expanded).
- Project context inside the agent workspace should use floating islands instead of permanent right columns.
- Chat streaming must render Markdown live, preserve contrast in light and dark themes, and never hard-refresh the transcript when a run completes.
- Support a local light mode preference while keeping dark as the default brand mode.

## Core screens

- Project Overview Hub
- Agent Workspace / Chat Island
- Production Package Card
- Planned Patch Review
- Workflow Timeline
- Asset Drawer
- Editor Bridge
- ProjectMind Drawer
- Model Accordion
- Recovery Card

## Runtime event renderers required

- `assistant_message` → Chat bubble with mode label and memory references.
- `workflow_package` → Production Package Card.
- `project_patch_planned` → Patch Review Panel, not a generic tool card.
- `creative_workflow_needs_input` → Missing-input card, not approval UI.
- `tool_call` / `tool_result` → Collapsible receipt rows in timeline.
- `asset_generated` → Asset card with provenance and scene link.
- `error` / `recovery` → Recovery card with failed step and retry options.

## Acceptance criteria

- No workflow/package/patch output is rendered as a generic raw tool card.
- Large ProjectPatch outputs are never silently applied.
- Timeline hydration persists enough state to reload workflow cards and patch review after refresh.
- UI clearly distinguishes needs input, approval required, patch planned, patch applied, and error states.
- ProjectMind facts/decisions are visible and editable from the agent workspace.
- Responsive behavior: desktop 3-pane cockpit; tablet 2-pane; mobile single-column with drawers.
- Add tests for event-to-component mapping and patch review state transitions.

At the end of each phase, run lint/typecheck/tests, then commit with a clear message.
