# SceneBook Redesign Screen Map

This is the first-pass implementation map for the dark-first revamp. Current files are listed to orient future phases; each phase should keep existing routes stable.

## App Shell

- Current files/components: `app/globals.css`, `app/layout.tsx`, `app/(workspace)/layout.tsx`, `components/workspace-shell.tsx`
- Target design role: dark production cockpit with compact rail, steady blurred topbar, centered workspace canvas, and contextual drawers.
- Future notes: retire the light top nav and marquee language; keep routes stable.

## Project Dashboard / Overview

- Current files/components: `app/(workspace)/home/page.tsx`, `components/workspace/home-page-client.tsx`, `app/(workspace)/projects/[id]/page.tsx`
- Target design role: project overview hub with current direction, stage, ProjectMind summary, next action, recent outputs, assets, and analytics mini-summary.
- Future notes: keep editable project fields but make the agent path the dominant production action.

## Project Chat / Agent Workspace

- Current files/components: `app/(workspace)/projects/[id]/chat/page.tsx`, `components/workspace/project-chat-route-client.tsx`, `components/agent/agent-chat-island.tsx`
- Target design role: primary creation surface with chat island, workflow timeline, composer, model routing, contextual asset drawer, and ProjectMind drawer.
- Future notes: workflow, patch, asset, memory, and recovery entries must render as branded objects, not generic raw tool cards.

## ProjectMind Panel

- Current files/components: `components/agent/project-mind-panel.tsx`, `lib/agent/runtime-v4/memory/project-mind.ts`
- Target design role: editable memory/control drawer with brief facts, chosen direction, readiness, open questions, and next action.
- Future notes: preserve provenance and avoid implying the agent knows facts that are not stored.

## Workflow Package Cards

- Current files/components: `components/agent/workflow-card.tsx`, `components/agent/artifact-preview-card.tsx`, `components/agent/runtime-v4-event-adapter.ts`
- Target design role: production package object with Script, Shots, Assets, Publish, and Editor Handoff sections.
- Future notes: support revision requests and section selection without changing backend APIs.

## Patch Review / Trust Layer

- Current files/components: `components/agent/patch-preview-card.tsx`, `components/agent/approval-card.tsx`, `lib/agent/runtime-v4/patch/*`
- Target design role: deliberate white/bone review surface showing proposed mutation, affected objects, risk, operations, apply/edit/reject/branch, and JSON inspection.
- Future notes: large ProjectPatch outputs must stay persisted and server-applied through existing endpoints.

## Asset Drawer

- Current files/components: `components/agent/asset-drawer.tsx`, `components/agent/artifact-preview-card.tsx`, `components/workspace/project-chat-route-client.tsx`
- Target design role: thumbnail-first drawer organized by scene/beat with provenance, source/model, generation status, folder state, and editor import action.
- Future notes: asset cards should reveal what generated them and where they can be used next.

## Editor Bridge

- Current files/components: `app/editor/[cardId]/page.tsx`, `components/editor/EditorShell.tsx`, `components/editor/*`, `lib/agent/tools/import-to-editor.ts`
- Target design role: bridge selected scripts/shots/assets into the editor while preserving provenance and package metadata.
- Future notes: bridge-first restyle only; full editor theming follows after cockpit stability.

## Integrations Settings

- Current files/components: `app/settings/integrations/page.tsx`, `components/integrations/integration-card.tsx`, `components/integrations/integration-connect-button.tsx`, `components/integrations/integration-status-badge.tsx`
- Target design role: dark settings surface with clear connection state, capability copy, and Nango trust boundaries.
- Future notes: do not imply external side effects can run without approval.

## Auth Screens

- Current files/components: `app/sign-in/page.tsx`, `app/sign-up/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`
- Target design role: branded portal using the dark shell, logo mark, calm form panels, and stable auth messaging.
- Future notes: keep Supabase flows unchanged.

## Global Settings

- Current files/components: `app/(workspace)/settings/page.tsx`, `app/settings/integrations/page.tsx`, `components/workspace-shell.tsx`
- Target design role: utility area for account, integrations, model routing defaults, and workspace preferences.
- Future notes: settings should feel quiet and operational, not like a marketing page.
