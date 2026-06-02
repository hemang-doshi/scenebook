# SceneBook Design Migration Plan

## D0 - Brand Pack Ingestion

- Objective: install the canonical design source, public marks, screen map, migration plan, and root design summary.
- In-scope files: `docs/design/*`, `public/brand/*`, `DESIGN.md`.
- Out-of-scope items: app UI, global tokens, runtime code, package files, Supabase.
- Acceptance criteria: design docs and logos exist; app/runtime/package/Supabase files are unchanged.
- Suggested commit: `design: ingest scenebook brand system`

## D1 - Dark-First Token Migration

- Objective: move global CSS to exact SceneBook colors, radii, shadows, typography, motion tokens, and compatibility aliases.
- In-scope files: `app/globals.css`, `app/layout.tsx`.
- Out-of-scope items: screen-specific redesign, runtime logic, data models.
- Acceptance criteria: exact brand token values are active; legacy aliases map to the new system; reduced motion is respected.
- Suggested commit: `design: migrate scenebook tokens`

## D2 - Primitive Component Redesign

- Objective: restyle buttons, badges, cards, panels, inputs, textareas, selects, tabs, and receipt primitives.
- In-scope files: `components/ui/*`.
- Out-of-scope items: route-level layout and backend APIs.
- Acceptance criteria: controls use SceneBook pill/card geometry, semantic states, dark focus rings, and light-surface variants.
- Suggested commit: `design: restyle scenebook primitives`

## D3 - App Shell Redesign

- Objective: replace the light top nav/marquee with dark cockpit shell, compact rail, blurred topbar, and responsive drawers.
- In-scope files: `components/workspace-shell.tsx`, `app/(workspace)/layout.tsx`.
- Out-of-scope items: changing URLs or auth behavior.
- Acceptance criteria: desktop is rail/center/context, tablet is two-pane, mobile is single column with drawer navigation.
- Suggested commit: `design: redesign app shell`

## D4 - Project Overview Hub

- Objective: make `/home` and `/projects/:id` into production hubs that surface stage, ProjectMind, next action, recent outputs, assets, and analytics.
- In-scope files: `components/workspace/home-page-client.tsx`, `app/(workspace)/projects/[id]/page.tsx`, related workspace cards.
- Out-of-scope items: editor timeline theming and external publishing behavior.
- Acceptance criteria: agent path is primary; project properties remain editable; overview matches dark-first brand.
- Suggested commit: `design: redesign project overview hub`

## D5 - Agent Workspace Redesign

- Objective: make `/projects/:id/chat` the primary creation surface with a centered empty state, docked active chat, timeline rail, model routing, and contextual drawer.
- In-scope files: `components/agent/agent-chat-island.tsx`, `agent-composer.tsx`, `chat-message.tsx`, `model-accordion.tsx`, `empty-agent-state.tsx`.
- Out-of-scope items: changing runtime stream shape.
- Acceptance criteria: workflow, patch, artifact, memory, input, error, and recovery states render as branded objects.
- Suggested commit: `design: redesign agent workspace`

## D6 - Patch Review / Trust Layer

- Objective: make planned ProjectPatch output inspectable and deliberate.
- In-scope files: `components/agent/patch-preview-card.tsx`, `approval-card.tsx`, patch UI tests.
- Out-of-scope items: client-side patch execution and backend patch schema changes.
- Acceptance criteria: review shows risk, operations, affected objects, apply/edit/reject/branch actions, and JSON inspection.
- Suggested commit: `design: redesign patch review`

## D7 - Asset Drawer / Editor Bridge

- Objective: expose asset provenance and editor import state without fully retheming the editor.
- In-scope files: `components/agent/asset-drawer.tsx`, `components/editor/TopBar.tsx`, editor handoff affordances.
- Out-of-scope items: full editor canvas/timeline theme migration.
- Acceptance criteria: assets show source/provenance, scene/beat grouping, and import-to-editor action.
- Suggested commit: `design: add editor bridge affordances`

## D8 - Integrations UI Restyle

- Objective: align integrations settings with the dark trust-oriented system.
- In-scope files: `app/settings/integrations/page.tsx`, `components/integrations/*`.
- Out-of-scope items: new providers, Nango API changes, external side effects.
- Acceptance criteria: connection states are legible, disabled states explain configuration, and credentials boundary remains clear.
- Suggested commit: `design: restyle integrations settings`

## D9 - Auth / Settings / Utility Screens

- Objective: apply the brand shell to sign-in, sign-up, password reset, global settings, and utility pages.
- In-scope files: `app/sign-in/page.tsx`, `app/sign-up/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, settings pages.
- Out-of-scope items: auth provider changes.
- Acceptance criteria: forms keep existing behavior and match the new visual language.
- Suggested commit: `design: restyle auth and settings`

## D10 - Visual QA And Regression Pass

- Objective: verify responsive layout, accessibility, runtime mapping, patch review, and visual consistency.
- In-scope files: focused unit tests, Playwright tests, QA docs.
- Out-of-scope items: feature expansion.
- Acceptance criteria: lint, typecheck, targeted unit tests, and responsive Playwright smoke checks pass or unrelated failures are clearly reported.
- Suggested commit: `test: add scenebook design regression checks`
