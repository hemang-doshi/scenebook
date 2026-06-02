# SceneBook Design System

This folder is the canonical SceneBook design system for the dark-first UI/UX revamp.

## Source Of Truth

- Original HTML source: `docs/design/source/Pasted-code.html`
- Product design system: `docs/design/design.md`
- Consolidated brand pack: `docs/design/brand-pack.md`
- Motion language: `docs/design/motion-pack.md`
- Implementation brief: `docs/design/implementation-pack.md`
- Extracted tokens: `docs/design/tokens`
- Logo assets: `docs/design/assets/logos`

## Rules

- Use the brand pack to guide the full dark-first UI/UX revamp.
- Do not invent new colors, radii, shadows, typography, or motion values.
- Use white and bone surfaces only for review, docs, exports, final summaries, and other clarity moments.
- Treat agent runtime objects as first-class UI: workflow packages, planned patches, receipts, assets, ProjectMind facts, and recovery states.

## Phase Guardrail

Do not modify app UI or global tokens in the ingestion phase. D0 only installs the design source of truth.

## Migration Phases

- D0 - Brand pack ingestion
- D1 - Dark-first token migration
- D2 - Primitive component redesign
- D3 - App shell redesign
- D4 - Project overview hub
- D5 - Agent workspace redesign
- D6 - Patch review/trust layer
- D7 - Asset drawer/editor bridge
- D8 - Integrations UI restyle
- D9 - Auth/settings/utility screens
- D10 - QA/docs/tests
