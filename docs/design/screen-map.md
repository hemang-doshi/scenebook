# SceneBook Redesign Screen Map

This first-pass map is high-level and implementation-oriented. It documents likely current files for later design phases only; do not modify these files in D0.

## App Shell

- Current likely files/components: `app/globals.css`, `app/layout.tsx`, `app/(workspace)/layout.tsx`, `components/workspace-shell.tsx`
- Target design role: establish the dark-first application frame, base surfaces, navigation hierarchy, and global layout rhythm.
- Notes for future design phases: D1 and D3 should migrate tokens and shell structure without changing runtime behavior in D0.

## Project Dashboard / Overview

- Current likely files/components: `app/page.tsx`, `app/(workspace)/home/page.tsx`, `app/(workspace)/projects/[id]/page.tsx`, `components/workspace/home-page-client.tsx`
- Target design role: become the primary project entry surface with project state, recent work, next action, and clear creation paths.
- Notes for future design phases: D4 should use the canonical tokens and patterns after D1-D3 establish the base system.

## Project Chat / Agent Workspace

- Current likely files/components: `app/(workspace)/projects/[id]/chat/page.tsx`, `components/workspace/project-chat-route-client.tsx`, `components/agent/agent-chat-island.tsx`
- Target design role: act as the focused agent workspace where conversation, workflow packages, patch proposals, receipts, and assets feel like one production surface.
- Notes for future design phases: D5 should preserve existing runtime streams and route contracts while restyling the interaction model.

## ProjectMind Panel

- Current likely files/components: `components/agent/project-mind-panel.tsx`
- Target design role: present durable project memory, decisions, open questions, and readiness signals as a trusted contextual panel.
- Notes for future design phases: D5 should keep ProjectMind provenance legible and avoid inventing stored facts.

## Workflow Package Cards

- Current likely files/components: `components/agent/workflow-card.tsx`, `components/agent/artifact-preview-card.tsx`, `components/agent/tool-call-card.tsx`
- Target design role: make generated workflow packages scannable as structured production objects rather than generic event cards.
- Notes for future design phases: D5 should align card hierarchy, statuses, and actions with the extracted design tokens.

## Patch Review / Trust Layer

- Current likely files/components: `components/agent/patch-preview-card.tsx`, `components/agent/tool-call-card.tsx`
- Target design role: provide a deliberate review surface for proposed changes, risk, affected objects, operations, and approval actions.
- Notes for future design phases: D6 should keep ProjectPatch trust boundaries explicit and avoid changing server-apply behavior.

## Asset Drawer

- Current likely files/components: `components/agent/asset-drawer.tsx`, `components/agent/artifact-preview-card.tsx`, `components/workspace/project-chat-route-client.tsx`
- Target design role: organize generated and imported assets by use, provenance, status, and handoff readiness.
- Notes for future design phases: D7 should connect assets to editor bridge flows without broad editor retheming.

## Editor Bridge

- Current likely files/components: `components/agent/artifact-preview-card.tsx`, `components/agent/patch-preview-card.tsx`
- Target design role: make editor handoff feel intentional, inspectable, and connected to the source workflow package.
- Notes for future design phases: D7 should document and expose handoff state before deeper editor redesign work.

## Integrations Settings

- Current likely files/components: `app/settings/integrations/page.tsx`, `components/integrations/integration-card.tsx`, `components/integrations/integration-connect-button.tsx`, `components/integrations/integration-status-badge.tsx`
- Target design role: show integration state, connection affordances, and trust boundaries in the dark-first settings language.
- Notes for future design phases: D8 should restyle the UI without changing Nango or provider behavior.

## Auth Screens

- Current likely files/components: `app/sign-in/page.tsx`, `app/sign-up/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`
- Target design role: provide a branded entry experience that feels calm, clear, and consistent with the dark-first product shell.
- Notes for future design phases: D9 should preserve Supabase flows and only change presentation.

## Global Settings

- Current likely files/components: `app/(workspace)/settings/page.tsx`, `components/settings/settings-page-client.tsx`, `app/settings/integrations/page.tsx`
- Target design role: support account, workspace, model, and integration preferences as quiet operational surfaces.
- Notes for future design phases: D9 should keep settings dense and predictable, with D8 handling integrations-specific polish.
