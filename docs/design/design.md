# SceneBook Design System

**Source of truth:** `source/Pasted code.html`  
**Brand role:** AI production workspace for short-form creators.  
**Design stance:** premium creator tooling, not enterprise cosplay and not a toy creator app.

---

## 1. Source-derived design thesis

SceneBook should feel like a dark production cockpit where ideas become structured creative work. The source defines the product as a system that turns rough creator ideas into scripts, assets, edits, and publish-ready short-form videos. The UI language is dark-first, controlled, spacious, and agent-led.

The product should behave like:

- **A planning desk** for one reel/project at a time.
- **A production assistant** that generates script, shots, assets, tasks, and publish notes.
- **A memory system** that remembers project decisions and rejected directions.
- **A trust layer** that shows patches, diffs, risk labels, and receipts before anything is applied.
- **An editor bridge** that moves selected assets and metadata into the timeline.

### Chief design decision

The agent is not a chatbot panel. The agent is the primary creation surface. Everything else exists to make its work inspectable, editable, and safe.

---

## 2. Brand foundation

### Personality

Sharp, creative, practical, fast, and calm under pressure. SceneBook should feel like a senior creative producer who can also operate the workspace.

### Product promise

One project per reel. One agent that remembers context. One path from:

```text
idea → script → shots → assets → edit → publish → learn
```

### Emotional target

The creator should feel: “I can finally see the whole creative workflow, not just a pile of notes and generated outputs.”

### Guardrail

Do not make SceneBook look like:

- A generic AI dashboard.
- A movie-editing clone with random cinematic decoration.
- A corporate social media suite.
- A glassmorphism-heavy “AI sparkle” app.

---

## 3. Color system

The source is explicit: use color as signal, not decoration.

### Core surfaces

| Token | Value | Role |
|---|---:|---|
| `--bg` | `#07080b` | Primary app background / midnight shell |
| `--bg-2` | `#0b0d12` | Secondary dark background |
| `--bg-3` | `#10131a` | Elevated dark background |
| `--panel` | `#141821` | Main console panel |
| `--panel-2` | `#191e29` | Secondary panel |
| `--panel-3` | `#202633` | Higher panel |
| `--white` | `#fffdf8` | Script/document/review surface |
| `--bone` | `#f7f3ea` | Warm light secondary surface |
| `--stone` | `#e8dfd2` | Warm neutral support |

### Text and lines

| Token | Value | Role |
|---|---:|---|
| `--ink` | `#fffdf8` | Primary text on dark |
| `--ink-soft` | `#f6efe2` | Softer text on dark |
| `--muted` | `#9aa3b2` | Secondary text |
| `--muted-2` | `#737d8c` | Tertiary text / inactive glyphs |
| `--line` | `rgba(255,255,255,.105)` | Default dark-surface border |
| `--line-strong` | `rgba(255,255,255,.18)` | Stronger border / CTA border |
| Light ink from CSS | `#111318` | Primary text on white/bone |
| Light muted from CSS | `#5d6470` | Secondary text on white/bone |

### Semantic accents

| Token | Value | Meaning | Use |
|---|---:|---|---|
| `--coral` | `#ff6847` | Creative energy / cue / primary generated work | Active glyphs, creative CTAs, play mark, hot states |
| `--coral-2` | `#ff9b80` | Soft coral text | Hot pills on dark surfaces |
| `--blue` | `#69a7ff` | Runtime/system/agent action | Focus ring, system gradients, editor bridge |
| `--blue-2` | `#a8cdff` | Soft blue text | Blue pills / agent state labels |
| `--lime` | `#b8ff6a` | Safe/applied/live | Success pills, live ProjectMind dot |
| `--amber` | `#ffcf6a` | Medium risk / warning | Traffic dot, risk-med, progress gradient |
| `--violet` | `#a78bfa` | Model selection / power control | Model menu, advanced runtime control |
| `--mint` | `#6cf0c2` | Fresh/generated support | Secondary success/generative accent, sparingly |
| `--danger` | `#ff5d73` | High risk/error | Risk-high, destructive recovery states |
| `--success` | `#7cf29a` | System success | Traffic dot / positive completion |

### Black-on-white / white-on-black rule

- **Dark app shell:** `#07080b` / `#0b0d12` / `#141821` with `#fffdf8` and `#9aa3b2` text.
- **White review/doc shell:** `#fffdf8` or `#f7f3ea` with `#111318` and `#5d6470` text.
- **Use white surfaces for clarity moments:** patch review, documents, exports, final answer surfaces, printable summaries.
- **Do not make the whole workspace light.** The source positions creation inside the dark cockpit.

### Gradient rules

Allowed source-derived gradients:

```css
/* body ambience */
radial-gradient(circle at 17% -3%, rgba(255,104,71,.20), transparent 26rem),
radial-gradient(circle at 90% 3%, rgba(105,167,255,.16), transparent 28rem),
linear-gradient(180deg, #07080b 0%, #0b0d12 38%, #07080b 100%);

/* product frame */
linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.035));

/* thumbnails */
linear-gradient(135deg, rgba(255,104,71,.74), rgba(105,167,255,.54));

/* progress */
linear-gradient(90deg, var(--coral), var(--amber));

/* editor bridge */
linear-gradient(90deg, var(--blue), var(--violet));
```

Gradients belong in media cards, thumbnails, generated asset previews, hero/product frames, and progress indicators. Do not turn every CTA into a gradient.

---

## 4. Typography

### Families

| Role | Source stack |
|---|---|
| Display | `"Space Grotesk", "Inter Tight", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Body | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Mono | `"SFMono-Regular", "Cascadia Code", "Roboto Mono", ui-monospace, Menlo, Monaco, Consolas, monospace` |

### Type scale

| Role | Size | Line-height | Letter spacing | Use |
|---|---:|---:|---:|---|
| Hero Display | `56px–122px` | `.96` | `-.065em` | Landing, major product claims |
| Section Heading | `42px–76px` | `.96–1.00` | `-.065em` | Major sections |
| H3 | `30px–46px` | `1.04` | `-.065em` | Subsections |
| Card Title | `24px` | `1.08` | `-.04em` | Artifact/component titles |
| Lead | `18px–22px` | `1.45` | inherited | Product explanations |
| Body | `15px–18px` | `1.5–1.55` | `-.01em` | UI copy and docs |
| Mono Label | `11px–13px` | `1–1.4` | `+.06em–+.08em` | Runtime event names, state labels, receipts |

### Rule

Use massive display type for positioning and calm mono labels for runtime clarity. The product is allowed to feel cinematic in headings, but the workspace copy must stay factual and useful.

---

## 5. Layout and surfaces

### Containers and spacing

- Max container: `1180px`.
- Desktop page container: `calc(100vw - 40px)`.
- Mobile page container: `calc(100vw - 28px)`.
- Default section padding: `92px 0`.
- Compact section padding: `58px 0`.
- Mobile section padding: `66px 0`.

### Responsive breakpoints from source

| Breakpoint | Behavior |
|---:|---|
| `max-width: 1060px` | Hide nav links; collapse hero/logo/section grids to one column; workspace becomes two columns; inspector hides; swatches go 2-column. |
| `max-width: 720px` | Workspace becomes single column; rail hides; swatches/cards become one column; type rows stack; nav compresses. |

### Surface hierarchy

1. **App background** — radial ambience over midnight shell.
2. **Product frame** — bordered, rounded, shadowed dark glass panel.
3. **Workspace shell** — 3-pane cockpit: rail, canvas, inspector.
4. **Cards** — subtle border, translucent fill, restrained shadow only when floating.
5. **White/bone panels** — used for source-of-truth clarity, docs, review, export, and final surfaces.

### Radius system

| Token | Value | Use |
|---|---:|---|
| `--radius-xs` | `4px` | Tiny marks |
| `--radius-sm` | `8px` | Small controls / keys |
| `--radius-md` | `16px` | Project tiles / inner cards |
| `--radius-lg` | `22px` | Product frames / major cards |
| `--radius-xl` | `30px` | Large surfaces |
| `--radius-2xl` | `38px` | Major light sections |
| `--radius-pill` | `999px` | Pills / CTAs |

### Shadow system

| Token | Value | Use |
|---|---|---|
| `--shadow` | `0 24px 80px rgba(0,0,0,.42)` | Hero product frame / major floating surfaces |
| `--shadow-soft` | `0 10px 42px rgba(0,0,0,.28)` | Chat cards, code blocks, soft elevation |

Rule: if everything casts a shadow, nothing feels elevated. Use shadows only for floating chat, patch review, modals, and product preview frames.

---

## 6. Logo system

### Mark idea

The SceneBook mark combines:

- A rounded scene/app frame.
- Script/book lines.
- Coral play/scene triangle.
- Blue memory/scene-flow stroke.
- White/coral/blue gradient border on the dark primary mark.

### Variants

| Variant | Surface | File |
|---|---|---|
| Primary dark mark | Dark app shell, splash, navbar, favicon | `logos/scenebook-mark-dark.svg` |
| Light-surface mark | White/bone docs, exported PDFs, social cards | `logos/scenebook-mark-light.svg` |

### Logo specifications

| Rule | Value |
|---|---:|
| Mark viewBox | `0 0 64 64` |
| Primary mark outer rect | `x=7 y=7 width=50 height=50 rx=15` |
| Primary fill | `#07080b` |
| Primary gradient stops | `#fffdf8 → #ff6847 at 0.42 → #69a7ff` |
| Wordmark tracking | `-.06em` |
| Navbar mark | `40px` |
| Display mark | `152px` |
| Lockup mark | `52px` |
| Minimum mark | `24px` |
| Minimum lockup | `96px` |
| Clear space | `1× inner radius around mark` |

### Do not

- Do not replace the triangle with a generic play-button logo.
- Do not add film reels, cameras, clapperboards, or mascot elements.
- Do not recolor the mark outside the source palette.
- Do not use a gradient-heavy wordmark.

---

## 7. Component language

### App shell

Desktop structure:

```text
left compact rail | center workspace canvas | right contextual drawer
```

Rules:

- Navigation is quiet; creation dominates.
- Rail items use muted text and active coral glyphs.
- Inspector/drawer is contextual, not a permanent dumping ground.
- Analytics exists as the learning loop, not the main workspace.

### Topbar

- Sticky topbar with `backdrop-filter: blur(18px)`.
- Dark translucent background: `rgba(7,8,11,.74)`.
- Bottom border: `--line`.
- Height: `72px`.

### Buttons

Base:

```css
border: 1px solid var(--line-strong);
background: rgba(255,255,255,.055);
color: var(--ink);
border-radius: var(--radius-pill);
padding: 11px 17px;
font: 620 13px/1 var(--body);
min-height: 40px;
transition: transform .18s ease, border-color .18s ease, background .18s ease;
```

Hover:

```css
transform: translateY(-1px);
border-color: rgba(255,255,255,.32);
background: rgba(255,255,255,.09);
```

Button semantics:

| Variant | Source style | Use |
|---|---|---|
| Default | translucent dark | Secondary actions |
| Primary | `#fffdf8` fill, dark text | Main action on dark surface |
| Coral | `#ff6847` fill, `#120a07` text | Apply / creative commit action |
| Dark | `#090b10`, white text | Action on light surface |
| Ghost-light | transparent, dark text | Light panel secondary action |

### Pills

Pills are compact mono state labels. They should carry the state vocabulary of the product.

| Class | Semantic | Visual source |
|---|---|---|
| Default | neutral metadata | muted text, translucent dark fill |
| `.good` | live/safe/applied | lime text, lime border/fill tint |
| `.hot` | planned/creative/attention | coral text, coral border/fill tint |
| `.blue` | runtime/system | blue text, blue border/fill tint |
| `.violet` | model/advanced | violet text, violet border/fill tint |

### Cards

Base card:

- `1px` translucent line.
- `22px` radius for major cards.
- `24px` padding.
- Translucent fill: `rgba(255,255,255,.045)`.
- Minimum height only when needed to balance grids.

### Chat cards

- Agent card: dark translucent, white/muted text, right margin.
- User card: white tinted surface `rgba(255,253,248,.92)`, dark text, left margin.
- Labels are uppercase mono, small, and timestamp/state-friendly.

### Timeline rows

The timeline is the receipt trail. It should render compact, inspectable state rows:

```text
[object/action] [summary] [state pill]
```

Rows use:

- `12px` text.
- Muted copy.
- White object labels.
- `12px` radius.
- `rgba(255,255,255,.046)` fill.

### Asset cards

Asset thumbnails use controlled gradients and source/provenance text. Generated media must show:

- Scene/beat link.
- Type: image, video, audio, prompt, script block.
- Model/source.
- Generation status.
- Import state.
- Next action: rename, folder, regenerate, import to editor.

### Patch review

Patch review is a trust layer, not a modal afterthought.

Must show:

- What will change.
- Affected object tree.
- Risk labels.
- Before/after where relevant.
- Apply/edit/reject/branch actions.
- Inspect JSON option.

No large workspace mutation should silently apply.

---

## 8. UX architecture

### Old problem

The source calls out that splitting assets, script, generation, tasks, editor, and analytics too early creates a tab maze.

### New IA

| Surface | Role |
|---|---|
| Project Overview | Hub: status, brief, current direction, stage, ProjectMind, next action, recent outputs |
| Agent Workspace | Primary creation surface: chat, slash commands, model accordion, timeline, contextual drawer |
| Patch Review | Trust layer: planned workspace changes and approval states |
| Asset Drawer | Scene/beat folder system and generated asset provenance |
| Editor Bridge | Move selected script/shots/assets into editor while preserving provenance |
| Analytics | Learning loop and next experiment prompts |

### Core flow

1. Start/open project.
2. Enter agent island.
3. Generate structured production package.
4. Review planned patch.
5. Apply, edit, or branch.
6. Import into editor and learn from analytics.

---

## 9. Runtime UI contract

The agent runtime must turn events into visible product objects.

| Runtime event | UI component | Required affordance |
|---|---|---|
| `assistant_message` | Chat bubble with mode label and memory references | Reply, pin, convert to task, create alternate direction |
| `workflow_package` | Production Package Card with Script, Shots, Assets, Publish tabs | Preview, select sections, request revision, plan patch |
| `project_patch_planned` | Patch Review Panel with diff tree and risk labels | Apply, edit, reject, version, inspect JSON |
| `creative_workflow_needs_input` | Input Request Card | Answer missing question, choose defaults, skip safely |
| `tool_call` / `tool_result` | Collapsible receipt row in timeline | Inspect params/result, copy, retry when safe |
| `asset_generated` | Asset card with provenance and scene link | Rename, folder, regenerate, import to editor |
| `error` / `recovery` | Recovery card with exact failed step | Retry, change model, continue from last safe state |

### Required state vocabulary

Do not collapse these into one generic “approval” state:

- `needs_input`
- `approval_required`
- `patch_planned`
- `patch_applied`
- `error`
- `recovery_available`

---

## 10. Screen system

### 01 · Project Overview

Must contain:

- Project title/current brief.
- Current stage.
- ProjectMind summary.
- Chosen direction.
- Recent agent outputs.
- Next recommended action.
- Analytics mini-summary.

### 02 · Agent Island

Must contain:

- Centered chat island on empty projects.
- Docked workspace chat once active.
- Mode switcher: Plan, Goal, Creation, Review, Workspace.
- Slash-command composer.
- Model accordion.
- Timeline rail.
- Contextual drawer.

### 03 · Patch Review

Must contain:

- Summary of proposed mutation.
- Diff tree.
- Risk labels: low, medium, high.
- Affected entities.
- Apply, edit first, branch version, reject.
- Inspect JSON.

### 04 · Asset Drawer + Editor Bridge

Must contain:

- Scene/beat folders.
- Thumbnail-first cards.
- Prompt/model provenance.
- Import-to-editor action.
- Selected package metadata.

---

## 11. Accessibility and interaction

- Keyboard focus uses `--blue` outline with `outline-offset: 3px`.
- Pills cannot rely on color only; state copy must be readable.
- Use visible text for runtime states and risks.
- Respect reduced motion.
- Maintain contrast on white/bone surfaces using `#111318` and `#5d6470`.
- Keep generated-object actions keyboard reachable.

---

## 12. Implementation acceptance criteria

- No workflow/package/patch output renders as a generic raw tool card.
- Large ProjectPatch outputs are never silently applied.
- Timeline hydration persists enough state to reload workflow cards and patch review after refresh.
- The UI distinguishes needs input, approval required, patch planned, patch applied, and error states.
- ProjectMind facts/decisions are visible and editable from the agent workspace.
- Responsive behavior matches the source: desktop 3-pane cockpit, tablet 2-pane, mobile single column with drawers.
- Event-to-component mapping and patch-review state transitions have tests.
