# SceneBook Design System

SceneBook's active design source is `docs/design`. The extracted brand pack and preserved HTML source define the UI/UX direction for the dark-first revamp.

## Canonical Sources

- `docs/design/source/Pasted-code.html` - original visual source of truth.
- `docs/design/design.md` - structured product design system.
- `docs/design/brand-pack.md` - brand, UI, UX, runtime object, and implementation guardrails.
- `docs/design/motion-pack.md` - timing, motion principles, and reduced-motion rules.
- `docs/design/tokens/scenebook.tokens.css` - exact CSS tokens.
- `docs/design/tokens/scenebook.tokens.json` - machine-readable token map.
- `docs/design/implementation-pack.md` - implementation brief.

## Product Direction

SceneBook is a dark-first AI production workspace for short-form creators. It should feel like a calm creative cockpit where one project moves from idea to script, shots, assets, edit, publish, and learn.

The agent is the primary creation surface. Workflow packages, planned patches, timeline receipts, generated assets, ProjectMind facts, and recovery states must render as first-class product objects.

## Non-Negotiables

- Do not invent new colors, typography, radii, shadows, gradients, or motion values.
- Use the exact SceneBook palette from the token files.
- Keep the dark app shell primary.
- Reserve white and bone surfaces for review, docs, exports, patch inspection, final summaries, and clarity moments.
- Use color semantically: coral for creative cues, blue for runtime/system, lime for safe/applied, violet for model/power controls, amber for medium risk, danger for high risk/error.
- Planned ProjectPatch output must be reviewable before apply.
- Generic tool cards are not acceptable for core workflow/package/patch/recovery events.

## Active Migration

The implementation should follow `docs/design/migration-plan.md`:

1. D0 - Brand pack ingestion
2. D1 - Dark-first token migration
3. D2 - Primitive component redesign
4. D3 - App shell redesign
5. D4 - Project overview hub
6. D5 - Agent workspace redesign
7. D6 - Patch review/trust layer
8. D7 - Asset drawer/editor bridge
9. D8 - Integrations UI restyle
10. D9 - Auth/settings/utility screens
11. D10 - Visual QA and regression pass

The previous Notion-inspired analysis is retired as an active design source.
