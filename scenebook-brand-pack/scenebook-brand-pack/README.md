# SceneBook Brand Pack

This package converts the self-contained `Pasted code.html` source of truth into repo-ready design documentation, motion rules, tokens, and logo assets.

## Files

- `brand-pack.md` — single consolidated brand pack.
- `design.md` — structured product design system and UX rules.
- `motion-pack.md` — motion language, timing tokens, transition rules, and implementation snippets.
- `tokens/scenebook.tokens.css` — exact CSS variables extracted from the source HTML.
- `tokens/scenebook.tokens.json` — semantic token map for design/code handoff.
- `tokens/scenebook.motion.css` — motion utility CSS.
- `tokens/scenebook.motion.ts` — Framer Motion-style variants.
- `logos/scenebook-mark-dark.svg` — primary mark from the source.
- `logos/scenebook-mark-light.svg` — light-surface variant from the source.
- `prompts/codex-implementation-brief.md` — coding-agent prompt for implementation.
- `source/Pasted code.html` — original source file preserved unchanged.

## Non-negotiable

Do not invent a new theme on top of this. Use the HTML as the visual source of truth: dark-first app shell, white/bone review surfaces, coral/blue/lime/violet semantics, tight display typography, thin borders, restrained gradients, pill controls, patch-review trust layer, and agent runtime objects as first-class UI.
