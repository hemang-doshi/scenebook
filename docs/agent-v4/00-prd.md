# PRD - SceneBook Agent v4

## 1. Product Summary

SceneBook Agent v4 is the production agent architecture for SceneBook, a creative workspace for short-form video production. It should feel closer to Claude Code for video production than a generic chatbot: an inspectable operator that reads the project, reasons over the production state, proposes concrete next actions, runs typed tools, applies structured changes, and explains what changed only after the workspace proves it.

The agent is embedded in the SceneBook workspace. It helps creators move from idea capture to brief, script, shot plan, asset generation, edit handoff, publishing package, and performance iteration. It is conversational-first, but the conversation is the control surface for a real production system.

## 2. Problem

Short-form video work is fragmented across notes, scripts, folders, timelines, AI chat tabs, storage tools, publishing tools, and analytics surfaces. Generic chat assistants can generate ideas, but they do not reliably know:

- what the current project is trying to become,
- which creative decisions have already been made,
- which script or asset version is active,
- what is missing before the creator can shoot or edit,
- which external accounts are connected,
- which actions require approval,
- whether a mutation actually persisted.

SceneBook needs a production-grade agent that can operate on project state with trust boundaries, typed tools, memory, integrations, approval policies, and eval coverage.

## 3. Vision

The target experience:

> "Help me take this launch reel from rough idea to ready-to-edit."

Agent v4 should inspect the project, understand the production stage, ask only the highest-leverage question if context is missing, generate or refine creative work, update the workspace through typed tools, request approval for risky changes, and leave a clear trail of decisions and mutations.

The agent should behave like a creative producer and editor assistant:

- It can plan multi-step production work.
- It can patch structured project state.
- It can remember decisions and rejected directions.
- It can call media and integration tools.
- It can show tool progress and approvals inline.
- It can resume from memory without forcing the user to re-explain the project.

## 4. Target Users

### Primary User

Solo creator producing Instagram Reels, TikToks, YouTube Shorts, and LinkedIn videos.

### Secondary Users

- Founder-led content creator.
- Technical educator or devlog creator.
- Social media manager producing repeatable short-form formats.
- Small creative team preparing scripts, assets, and handoff packages.

## 5. Product Goals

1. Make the agent project-aware by default.
2. Turn conversation into reliable workspace operations.
3. Keep every mutation typed, observable, reversible where practical, and policy-checked.
4. Use ProjectMind memory so the agent remembers durable creative context.
5. Support production model routing through a model gateway, including Gemini.
6. Use Google auth as the user identity layer.
7. Use Nango as the bridge for external integrations.
8. Establish evals and trajectory tests before expanding autonomy.
9. Keep the UI conversational-first while making the agent's state and actions inspectable.

## 6. Non-Goals For This Phase

This phase is documentation only.

Do not implement:

- Agent Runtime v4 code.
- New database migrations.
- Tool runtime code.
- Model gateway code.
- Google auth changes.
- Nango integration code.
- UI implementation.
- Runtime migrations from prior harness versions.

## 7. Core Concepts

### Agent Runtime v4

The production runtime that owns the agent loop: observe, plan, decide, policy-check, act, verify, remember, and respond. It must be modular, testable, traceable, and independent from HTTP route code.

### ProjectMind Memory

The durable memory layer for a SceneBook project. ProjectMind stores creative brief fields, canonical decisions, open questions, resolved answers, script versions, asset intent, production stage, user preferences, integration context, and post-publish learnings.

### Typed Tool Runtime

A registry and executor for domain-specific tools. Every tool declares typed input, typed output, side effects, availability, approval policy, handler, verification, and telemetry metadata.

### ProjectPatch Mutation Layer

A structured mutation layer that represents intended project changes before they are applied. ProjectPatch makes workspace edits diffable, reviewable, policy-checkable, auditable, and easier to test.

### Model Gateway With Gemini Support

A provider-neutral model access layer for routing creative planning, structured decisions, multimodal understanding, eval judging, and generation tasks across supported providers. Gemini support is a first-class requirement, not a later adapter hack.

### Google Auth As User Identity

Google identity is the primary user identity for SceneBook. The agent runtime must derive user ownership, permissions, connected accounts, and audit attribution from authenticated Google users.

### Nango External Integration Bridge

Nango manages OAuth connections and token lifecycle for external services such as Google Drive, YouTube, TikTok, Instagram-capable providers, Notion, Slack, or future production tools. Agent tools call integration adapters through Nango-backed connections.

### Approval Policies

Approval policies define when the agent can act automatically, when it must ask, and when it must refuse. Publishing, destructive edits, external side effects, paid generation, account changes, and irreversible mutations require explicit approval.

### Observability And Tracing

Every agent run must be traceable across model decisions, tool calls, policy decisions, ProjectPatch diffs, integration calls, memory reads/writes, errors, and final responses.

### Eval And Trajectory Tests

Agent behavior must be validated through deterministic tests that check the path the agent takes, not only the final text. Trajectory tests assert decisions, tool calls, approval boundaries, mutations, and truthfulness constraints.

### Conversational-First UI

The chat surface is the command center, but it must expose plans, tool activity, approvals, project state, and next actions without making the user parse raw logs.

## 8. Primary Use Cases

### UC1 - Project-Aware Ideation

The user asks for content ideas, angles, hooks, or formats. The agent reads ProjectMind and the current project state, then returns options with a recommendation and a concise rationale. It does not mutate workspace state unless requested or clearly safe.

### UC2 - Brief Creation And Refinement

The agent gathers or infers platform, audience, format, tone, duration, viewer promise, CTA, visual style, and constraints. It stores durable decisions in ProjectMind and marks unresolved questions without repeatedly asking them.

### UC3 - Script Generation

The agent generates a script package that includes hook, beat outline, spoken script, shot notes, captions, CTA, and edit rhythm. It saves through ProjectPatch and typed tools only after policy checks.

### UC4 - Script Revision

The user can ask for a sharper hook, tighter intro, alternate tone, platform rewrite, or critique. The agent compares against active script state, creates versions, and avoids overwriting approved material without approval.

### UC5 - Asset Planning And Generation

The agent identifies missing assets, creates prompts, routes to configured image/video/audio tools, verifies persistence, and attaches generated or imported assets to the project.

### UC6 - Edit Handoff

Until full timeline mutation exists, the agent creates an editor handoff package: ordered beats, asset references, shot timing, on-screen text, pacing guidance, audio notes, and risk flags.

### UC7 - Publishing Preparation

The agent prepares captions, hashtags, title variants, thumbnails, platform-specific notes, and scheduling recommendations. Actual publishing or scheduling requires approval and an available integration.

### UC8 - Analytics Iteration

After publishing, the agent reads analytics and prior creative decisions, then proposes iteration hypotheses, follow-up shorts, and reusable learnings for ProjectMind.

### UC9 - Natural Language Workspace Control

The user can say "make this the hook", "turn those into shoot tasks", "move these assets into B-roll", or "prepare a YouTube Shorts package". The agent converts intent into typed ProjectPatch operations and tool calls.

## 9. UX Principles

1. Conversation is the primary control surface.
2. Workspace state is the source of truth.
3. Plans should be concrete, brief, and editable.
4. Tool calls should be visible without feeling like debug output.
5. Approvals should be exact: show what will change, why approval is needed, and what external side effect may occur.
6. The final answer must summarize verified changes, not intentions.
7. The agent should ask one useful question instead of several weak questions.
8. The agent should preserve momentum by drafting safe artifacts automatically.
9. The user should always be able to inspect memory, patches, and run history.
10. The agent should never pretend to edit video, publish content, or call an integration that is unavailable.

## 10. Success Metrics

### User-Facing Metrics

- Time from rough idea to usable script.
- Time from script to edit handoff package.
- Percentage of projects resumed without repeated context entry.
- User approval acceptance rate for proposed patches.
- User-reported trust in final mutation summaries.

### Product Metrics

- Tool-call success rate.
- Approval-required actions executed without bypass: zero.
- False success claims: zero.
- ProjectPatch verification failures.
- Integration connection success rate.
- Number of production workflows completed per active creator.

### Engineering Metrics

- Agent route remains thin.
- Runtime modules have isolated tests.
- Tool schemas and ProjectPatch schemas are covered by contract tests.
- Trajectory tests cover all P0 workflows.
- Traces are sufficient to debug failed runs without replaying production data.

## 11. Launch Criteria

Agent v4 is production-ready when:

- Google-authenticated identity gates every run and mutation.
- ProjectMind can load, compact, update, and inspect durable project memory.
- The model gateway supports at least one default model and Gemini.
- Typed tools are registered centrally and executed through one executor.
- ProjectPatch validates, previews, applies, and verifies project mutations.
- Approval policies block risky actions until approved.
- Nango-backed integrations can expose connection state to the agent.
- Observability captures model, policy, tool, patch, memory, and integration spans.
- Trajectory tests pass for the launch workflow set.
- The UI makes plans, tool progress, approvals, and verified changes understandable.

## 12. Risks And Mitigations

### Risk: Agent Feels Like Chat Instead Of Software

Mitigation: Make ProjectMind, ProjectPatch, tool events, and next actions visible in the UI. Require typed tools for real workspace changes.

### Risk: Runtime Becomes A Large Route

Mitigation: Keep HTTP transport thin. Put the agent loop, model gateway, policy engine, tool executor, and ProjectPatch layer in runtime modules.

### Risk: Unsafe External Actions

Mitigation: Route integrations through Nango-backed connection metadata, enforce approval policies, and record exact external side effects in traces.

### Risk: Model Drift Breaks Workflows

Mitigation: Use schema validation, deterministic routing where possible, repair-once logic, and trajectory tests that fail on changed behavior.

### Risk: Memory Becomes Opaque Or Wrong

Mitigation: Store memory as typed facts, decisions, summaries, and rejected directions with provenance. Expose memory inspection and correction.

## 13. Open Questions

- Which initial external integrations are required for private beta?
- Which Gemini models should be default for multimodal context versus structured decisioning?
- What is the first editable editor surface: handoff artifact, timeline draft, or full timeline mutation?
- How should ProjectPatch previews appear in the first UI release?
- Which production events should be retained long term versus summarized into ProjectMind?
