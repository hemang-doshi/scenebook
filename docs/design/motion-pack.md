# SceneBook Motion Pack

**Source of truth:** `source/Pasted code.html`  
**Motion thesis:** SceneBook motion should feel like a production cockpit: calm, precise, responsive, inspectable. Motion exists to reveal structure, not to entertain.

---

## 1. Source-derived motion DNA

The HTML source uses motion very sparingly:

- Smooth page scroll: `html { scroll-behavior: smooth; }`
- Button transition: `.18s ease`
- Button hover lift: `translateY(-1px)`
- Copy feedback hold: `1400ms`
- Floating/depth effects through shadows, blur, radial ambience, and translucent borders.

This means SceneBook should avoid bouncy, playful, or over-animated UI. The product should feel quick, composed, and high-trust.

---

## 2. Motion tokens

The base duration is the source button transition: `180ms`. All additional durations are derived from that number so the motion system stays grounded in the source.

| Token | Value | Derivation | Use |
|---|---:|---|---|
| `--sb-motion-instant` | `0ms` | direct | state changes that should not animate |
| `--sb-motion-micro` | `90ms` | `0.5 × 180ms` | icon/glyph feedback |
| `--sb-motion-fast` | `180ms` | source | hover, focus, active state, compact controls |
| `--sb-motion-standard` | `270ms` | `1.5 × 180ms` | card enter, small panel enter |
| `--sb-motion-slow` | `360ms` | `2 × 180ms` | drawers, modals, workspace transitions |
| `--sb-motion-receipt` | `540ms` | `3 × 180ms` | timeline expansion, patch diff reveal |
| `--sb-motion-feedback-hold` | `1400ms` | source JS timeout | copied/applied temporary states |

### Easing

Use `ease` as the default. The source does not define spring physics. Avoid springy motion unless explicitly added later as a new design decision.

---

## 3. Core motion principles

### 1. Make the workspace feel stable

The shell, rail, and navigation should barely move. They are the stage, not the actor.

### 2. Let agent outputs enter with intent

Workflow packages, patch reviews, timeline receipts, and asset cards can enter with a small opacity/position reveal. This tells the creator something new was created.

### 3. Use expansion for inspectability

Tool receipts, JSON inspectors, and diff trees should expand vertically. This reinforces the “receipts” metaphor.

### 4. Use motion to separate risk

Risky actions should not animate like success. Patch planning can reveal slowly; applying can use short feedback; errors should be immediate and stable.

### 5. Preserve creator flow

Never animate text while the user is reading or editing. Do not animate inside active script blocks except for cursor/selection states handled by the editor.

---

## 4. Interaction choreography

### Buttons and pills

Source behavior:

```css
transition: transform .18s ease, border-color .18s ease, background .18s ease;
transform: translateY(-1px);
```

Rules:

- Hover lift maximum: `-1px`.
- Do not scale buttons.
- Do not add glow to every hover.
- Active/selected states should be conveyed by fill, border, state copy, and icon/glyph.

### Topbar

The topbar is sticky and blurred. It should not slide in/out during normal project work. Keep it steady.

### Chat island

Empty project:

1. Composer appears centered.
2. Suggested commands fade in beneath it.
3. Model accordion stays collapsed.

Active project:

1. Chat island docks into center workspace.
2. Timeline receipts appear as rows.
3. Contextual drawer opens only when an artifact requires inspection.

Recommended motion:

| Element | Enter | Exit |
|---|---|---|
| Empty composer | `270ms`, opacity + `translateY(8px)` | `180ms`, opacity |
| Chat message | `270ms`, opacity + `translateY(6px)` | no exit unless deleted |
| Timeline row | `180ms`, opacity + `translateY(4px)` | `180ms`, opacity |
| Context drawer | `360ms`, opacity + `translateX(12px)` | `180ms`, opacity + `translateX(8px)` |

### Production Package Card

When `workflow_package` arrives:

1. Card shell enters with `270ms` opacity + `translateY(8px)`.
2. Summary appears immediately with the shell.
3. Tabs are stable; do not animate tab layout.
4. Section expansion uses `540ms` maximum-height reveal.
5. “Plan patch” CTA receives normal button hover only.

### Shell and streaming motion rules

- Elastic left rail width transition uses `270ms ease`.
- Floating island expand/collapse uses `270ms ease`, opacity + size change, no spring.
- Chat token streaming must not animate every token; the message container grows naturally and autoscrolls only when the user is bottom-pinned.
- `prefers-reduced-motion` keeps all state changes instant.

### Planned Patch Review

Patch review should feel more deliberate:

1. Panel enters with `360ms` opacity + `translateY(8px)`.
2. Risk summary appears immediately.
3. Diff rows stagger by `90ms` if implementation supports it.
4. Apply action gives `1400ms` temporary “Applied” or “Copied” feedback before settling.

### Asset Drawer

Drawer opens from the right using `360ms` opacity + `translateX(12px)`. Asset cards inside can enter with `270ms` but should not cascade dramatically.

### Editor Bridge

When importing assets into the editor:

- Progress bar may animate width using `360ms ease`.
- Preserve source colors: coral→amber for creative progress; blue→violet for editor bridge.
- The final imported state should use lime/good semantics.

---

## 5. State-specific motion

| State | Motion behavior |
|---|---|
| `needs_input` | Gentle card enter; no shake, no alarm |
| `approval_required` | Stable panel; CTA focus clear |
| `patch_planned` | Slower reveal, diff rows visible |
| `patch_applied` | Fast state swap + `1400ms` feedback hold |
| `error` | Immediate, stable card; do not bounce |
| `recovery_available` | Reveal retry/options below error using receipt expansion |
| `asset_generated` | Asset card fade/slide into drawer; thumbnail loads without heavy skeleton animation |

---

## 6. Motion CSS

Use `tokens/scenebook.motion.css` as the source implementation file. Core utilities:

```css
:root {
  --sb-motion-instant: 0ms;
  --sb-motion-micro: 90ms;
  --sb-motion-fast: 180ms;
  --sb-motion-standard: 270ms;
  --sb-motion-slow: 360ms;
  --sb-motion-receipt: 540ms;
  --sb-motion-feedback-hold: 1400ms;
  --sb-ease: ease;
}
```

Utility classes included:

- `.sb-motion-hover-lift`
- `.sb-motion-panel-enter`
- `.sb-motion-drawer-enter`
- `.sb-motion-receipt-expand`

---

## 7. Reduced motion

Respect reduced motion globally:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 8. Do / don’t

### Do

- Use tiny movement, opacity, and expansion.
- Animate agent outputs and review surfaces, not the entire shell.
- Use progress motion for editor handoff and generation state.
- Keep hover motion at `-1px` lift.
- Make diff/receipt expansion feel inspectable.

### Don’t

- Do not use big bounces, elastic springs, or playful overshoot.
- Do not animate long-form text while reading.
- Do not use confetti for applied patches.
- Do not make all cards float on hover.
- Do not invent new glowing accent colors.
