# SceneBook Design Migration Plan

Use `docs/design/screen-map.md` as the concrete file map for later implementation phases.

## D0 - Brand Pack Ingestion

- Objective: install the canonical SceneBook design source of truth as docs, assets, and extracted token files.
- In-scope files: `docs/design/*`, `public/brand/*` canonical logo assets.
- Out-of-scope items: app UI, global tokens, runtime code, package files, lockfiles, Supabase migrations, and implementation behavior.
- Acceptance criteria: all required design docs, source HTML, token files, and logo assets exist or are confirmed identical to the brand source; no application runtime files are modified.
- Suggested commit message: `design: ingest scenebook brand system`

## D1 - Dark-First Token Migration

- Objective: migrate the app to the exact dark-first SceneBook token values from `docs/design/tokens`.
- In-scope files: `app/globals.css`, `app/layout.tsx`, token compatibility aliases required by existing components.
- Out-of-scope items: component redesign, route layout changes, runtime behavior, data models, and integrations.
- Acceptance criteria: global tokens use canonical colors, radii, shadows, typography, and motion values; reduced-motion behavior is preserved.
- Suggested commit message: `design: migrate scenebook tokens`

## D2 - Primitive Component Redesign

- Objective: restyle primitive controls and low-level UI surfaces using the migrated token system.
- In-scope files: shared primitive components, buttons, inputs, badges, cards, panels, tabs, menus, and status treatments.
- Out-of-scope items: route-level redesign, agent runtime changes, and new product capabilities.
- Acceptance criteria: primitives match SceneBook geometry, states, focus treatments, and density without breaking existing call sites.
- Suggested commit message: `design: redesign scenebook primitives`

## D3 - App Shell Redesign

- Objective: redesign the global app shell into the dark-first SceneBook workspace frame.
- In-scope files: app shell routes/layouts, navigation frame, workspace wrappers, and shell-level responsive behavior.
- Out-of-scope items: feature-specific cards, data fetching, auth flow changes, and route renames.
- Acceptance criteria: shell supports desktop, tablet, and mobile layouts; navigation remains stable; no runtime contracts change.
- Suggested commit message: `design: redesign app shell`

## D4 - Project Overview Hub

- Objective: redesign project overview surfaces as production hubs for project state, next action, recent outputs, and assets.
- In-scope files: project dashboard and overview route components.
- Out-of-scope items: agent chat workspace redesign, editor theming, and external tool behavior.
- Acceptance criteria: overview uses canonical tokens and primitives; project editing behavior remains intact.
- Suggested commit message: `design: redesign project overview hub`

## D5 - Agent Workspace Redesign

- Objective: redesign the project chat and agent workspace as the main creation cockpit.
- In-scope files: `app/(workspace)/projects/[id]/chat/page.tsx`, `components/workspace/project-chat-route-client.tsx`, `components/agent/*` workspace presentation components.
- Out-of-scope items: runtime-v4 event shape, model routing behavior, server actions, and persistence logic.
- Acceptance criteria: chat, workflow packages, ProjectMind, tool calls, artifacts, and recovery states render as cohesive branded objects.
- Suggested commit message: `design: redesign agent workspace`

## D6 - Patch Review / Trust Layer

- Objective: redesign patch review so proposed changes are inspectable, deliberate, and trustworthy.
- In-scope files: `components/agent/patch-preview-card.tsx`, patch review presentation components, related focused tests.
- Out-of-scope items: ProjectPatch schema changes, client-side patch execution, server apply behavior, and database migrations.
- Acceptance criteria: review shows affected objects, operations, risk, JSON inspection, and approve/edit/reject paths without changing patch mechanics.
- Suggested commit message: `design: redesign patch review trust layer`

## D7 - Asset Drawer / Editor Bridge

- Objective: redesign asset organization and editor handoff affordances.
- In-scope files: asset drawer/presentation components, artifact preview handoff states, editor bridge affordances.
- Out-of-scope items: full editor redesign, timeline/canvas rewrite, and media generation backend changes.
- Acceptance criteria: assets show provenance, status, grouping, and editor bridge state while preserving existing editor behavior.
- Suggested commit message: `design: redesign asset drawer editor bridge`

## D8 - Integrations UI Restyle

- Objective: restyle integrations settings with clear connection state and trust boundaries.
- In-scope files: `app/settings/integrations/page.tsx`, `components/integrations/integration-card.tsx`, `components/integrations/integration-connect-button.tsx`, `components/integrations/integration-status-badge.tsx`.
- Out-of-scope items: new integrations, Nango API changes, credential storage changes, and external side effects.
- Acceptance criteria: connection status, disabled states, and connect actions are legible and aligned to the canonical design system.
- Suggested commit message: `design: restyle integrations settings`

## D9 - Auth / Settings / Utility Screens

- Objective: bring auth, settings, and utility screens into the dark-first design language.
- In-scope files: auth routes, global settings routes, utility screens, and their presentation components.
- Out-of-scope items: Supabase auth behavior, account model changes, and integrations provider behavior.
- Acceptance criteria: existing flows continue to work while visual treatment matches the SceneBook system.
- Suggested commit message: `design: restyle auth settings utility screens`

## D10 - Visual QA And Regression Pass

- Objective: verify the redesign for responsive layout, accessibility, runtime mapping, trust surfaces, and visual consistency.
- In-scope files: focused unit tests, visual QA docs, Playwright smoke checks, and regression fixtures.
- Out-of-scope items: feature expansion and design system value changes.
- Acceptance criteria: lint, typecheck, focused unit tests, and responsive visual checks pass or unrelated failures are clearly documented.
- Suggested commit message: `test: add scenebook design regression coverage`
