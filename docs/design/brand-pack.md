# SceneBook Brand Pack

**Compiled from:** `source/Pasted code.html`  
**Owner mindset:** Chief Design direction for SceneBook  
**Purpose:** One source for brand, UI, UX architecture, motion, runtime objects, logo usage, and implementation guardrails.

---

## 0. North star

SceneBook is a dark-first AI production workspace that turns rough creator ideas into scripts, shots, generated assets, editor-ready packages, and publishing loops.

The brand should feel like:

```text
cinematic discipline + creator speed + agentic trust
```

The source already defines the correct vibe. Preserve it.

---

## 1. Non-negotiables

1. **Do not change the palette.** Use the extracted tokens.
2. **Dark-first shell stays primary.** White/bone is for review, docs, exports, and clarity surfaces.
3. **Color is semantic.** Coral = creative/cue, blue = runtime/system, lime = applied/safe, violet = model/power, amber = medium risk, danger = high risk.
4. **Agent outputs are product objects.** Packages, patches, receipts, assets, and recovery states need dedicated renderers.
5. **Patch review is mandatory.** Large workspace mutations must appear as planned patches with Apply/Edit/Reject/Branch.
6. **Motion is restrained.** Base timing is `180ms ease`; movement is small and purposeful.
7. **Gradients are controlled.** Use them for ambience, media, thumbnails, progress, and hero/product surfaces — not as generic decoration.
8. **Typography is confident but not noisy.** Huge tight headings; quiet readable UI; mono labels for runtime receipts.
9. **Shell orientation is nav-led.** No breadcrumbs; centered nav and active project labels provide wayfinding.
10. **Project context floats where needed.** Use an elastic left rail for global actions and floating islands for in-workspace context.

---

## 2. Brand strategy

### Positioning

SceneBook is the creator operating system for short-form video builders who want a complete creative workflow, not scattered notes, tabs, prompts, and generated files.

### Promise

One project per reel. One agent that remembers context. One path from idea to publishable cut.

### Personality

- Sharp
- Creative
- Practical
- Fast
- Calm under pressure
- Tasteful, not flashy
- Technical enough to be trusted, not technical for its own sake

### Voice

SceneBook should speak like a senior producer inside a product interface:

- Clear about what it is doing.
- Specific about what changed.
- Honest about uncertainty and missing inputs.
- Action-oriented.
- Never fluffy.

#### Example voice patterns

| Instead of | Use |
|---|---|
| “I generated some ideas.” | “I created 3 hook directions and recommend Option B because it shows the pain in the first 2 seconds.” |
| “Applying changes...” | “This will create 1 script version, 7 shot tasks, 5 asset prompts, and 1 editor handoff.” |
| “Something went wrong.” | “Asset generation failed at the thumbnail step. Your script and shot list are safe.” |

---

## 3. Visual identity

### Primary visual system

- Midnight dark background with subtle coral/blue radial ambience.
- Rounded console surfaces with thin translucent borders.
- Warm white/bone document surfaces for review/export.
- Coral/blue/lime/violet semantic pills and signals.
- Tight Space Grotesk-style display typography.
- Mono runtime labels.
- Thumbnail-first generated asset cards.
- Calm product cockpit layout.

### Logo

The mark combines scene frame, book/script lines, coral play cue, and blue memory/flow line. Use the included SVGs:

- `logos/scenebook-mark-dark.svg`
- `logos/scenebook-mark-light.svg`

Minimums:

- Mark: `24px`
- Lockup: `96px`
- Navbar mark: `40px`
- Display mark: `152px`

---

## 4. Token inventory

### Core colors

| Name | Value | Use |
|---|---:|---|
| Midnight | `#07080b` | app background |
| Console | `#141821` | panels |
| Script White | `#fffdf8` | docs/review |
| Studio Bone | `#f7f3ea` | secondary light panels |
| Cue Coral | `#ff6847` | creative cue/primary generated work |
| Runtime Blue | `#69a7ff` | agent/system/focus |
| Applied Lime | `#b8ff6a` | live/safe/applied |
| Model Violet | `#a78bfa` | model/advanced settings |
| Amber | `#ffcf6a` | medium risk / progress |
| Danger | `#ff5d73` | high risk/error |

Full machine-readable tokens are in:

- `tokens/scenebook.tokens.css`
- `tokens/scenebook.tokens.json`

---

## 5. UI architecture

### The product cockpit

Desktop:

```text
Elastic Left Rail / Center Workspace / Floating Context Islands
```

Tablet:

```text
Elastic Left Rail / Center Workspace
```

Mobile:

```text
Single column + drawers
```

### Screens

1. Project Overview Hub
2. Agent Workspace / Chat Island
3. Production Package Card
4. Planned Patch Review
5. Asset Drawer
6. Editor Bridge
7. Analytics Learning Loop

### Information architecture decision

Move script, shot list, generation, tasks, and packaging into the agent workspace. Keep Analytics separate. Keep Project Overview as the hub.

### Shell rules

- Shell has no breadcrumbs; orientation comes from centered nav and active project labels.
- Global actions live in an elastic left rail: `56px` collapsed, `248px` expanded.
- Project context lives in floating islands, not permanent right columns, inside the agent workspace.
- Chat transcript must never hard-refresh after a run completes.
- streaming Markdown renders live as blocks and preserves readable contrast on light and dark surfaces.
- Light mode is a user option; dark mode remains the default brand mode.

---

## 6. Runtime object system

SceneBook’s differentiator is not just generation; it is visible workflow state.

| Runtime event | Product object |
|---|---|
| `assistant_message` | Chat bubble |
| `workflow_package` | Production Package Card |
| `project_patch_planned` | Patch Review Panel |
| `creative_workflow_needs_input` | Input Request Card |
| `tool_call` / `tool_result` | Timeline Receipt Row |
| `asset_generated` | Asset Card |
| `error` / `recovery` | Recovery Card |

### Chief design call

Generic tool cards are banned for core workflow events. The renderer registry should map runtime events to branded, state-rich components.

---

## 7. Motion pack summary

Motion should be:

- Fast
- Calm
- Small
- Inspectability-focused
- Derived from `180ms ease`

Motion tokens:

| Token | Value |
|---|---:|
| instant | `0ms` |
| micro | `90ms` |
| fast | `180ms` |
| standard | `270ms` |
| slow | `360ms` |
| receipt | `540ms` |
| feedback hold | `1400ms` |

Implementation files:

- `motion-pack.md`
- `tokens/scenebook.motion.css`
- `tokens/scenebook.motion.ts`

---

## 8. Component system

### Required components

- `AppShell`
- `ProjectOverviewHub`
- `AgentWorkspace`
- `ChatIsland`
- `WorkflowTimeline`
- `ProductionPackageCard`
- `PlannedPatchReview`
- `InputRequestCard`
- `ToolReceiptRow`
- `AssetDrawer`
- `AssetCard`
- `EditorBridge`
- `ProjectMindDrawer`
- `ModelAccordion`
- `RecoveryCard`

### Component rules

- Components should expose explicit states, not hide them in generic text.
- Artifact cards need versioning and provenance.
- Patch Review needs risk and apply actions.
- Timeline must be filterable: all, decisions, tools, patches, assets, errors.
- ProjectMind memory must be editable.

---

## 9. Implementation phases

### Phase A — Tokens and shell

- Add CSS variables.
- Refactor app shell to dark-first cockpit.
- Implement rail, topbar, center workspace, contextual drawer primitives.

### Phase B — Runtime renderer registry

- Map runtime events to components.
- Prevent generic renderer fallback for known workflow events.
- Add tests for mapping.

### Phase C — Workflow package UI

- Build Production Package Card.
- Add tabs: Script, Shots, Assets, Publish, Editor Handoff.
- Support section selection and revision prompts.

### Phase D — Patch Review

- Build Planned Patch Review.
- Add diff tree, risk labels, inspect JSON, apply/edit/reject/branch states.
- Persist/reload planned patches.

### Phase E — Assets and editor bridge

- Build Asset Drawer with scene/beat folders.
- Add provenance and import state.
- Implement Editor Bridge metadata handoff.

### Phase F — Polish and resilience

- Motion utilities.
- Reduced-motion support.
- Responsive states.
- Empty/error/recovery states.
- A11y pass.
- Tests.

---

## 10. QA checklist

- [ ] Dark shell uses exact tokens.
- [ ] White surfaces are reserved for review/docs/export clarity.
- [ ] Coral/blue/lime/violet states are semantic and consistent.
- [ ] Runtime events render as first-class UI objects.
- [ ] Planned patches are explicit and never silently applied.
- [ ] ProjectMind facts and decisions are visible/editable.
- [ ] Timeline receipts persist after refresh.
- [ ] Motion respects reduced-motion settings.
- [ ] Mobile collapses to single column with drawers.
- [ ] No generic SaaS gradients or AI sparkle added.

---

## 11. Final design direction

SceneBook should look like a serious creative operating system: dark, calm, structured, cinematic, and trustworthy. The product should make creative work feel tangible: scripts, shot lists, asset prompts, edits, patches, decisions, and analytics should all become visible objects in one workspace.

Keep the source. Extend only through its logic.
