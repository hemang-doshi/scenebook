# PRD — SceneBook Production Agent Harness

## 1. Product Summary

SceneBook Agent is a project-aware creative operating agent for short-form content creators. It helps users take a content project from rough idea to script, asset plan, generated assets, editor handoff, publishing preparation, and analytics-driven iteration.

The agent should feel less like a chatbot and more like a creative producer embedded inside the SceneBook workspace.

It does not need to autonomously do everything. It must understand the project, maintain state, suggest next actions, generate and revise creative work, apply safe workspace updates, and ask for approval before risky actions.

## 2. Problem

The current agent experience risks becoming a glorified chatbot. It can respond conversationally and trigger some command tools, but it does not deeply understand project state or operate through a true agent loop.

Creators do not need another text box. They need a creative system that remembers:

- what the project is about,
- what stage it is in,
- what has already been decided,
- what still needs work,
- which script version is active,
- which assets are missing,
- what should happen next.

## 3. Target User

### Primary User

Solo short-form creator building Instagram Reels, TikToks, YouTube Shorts, and LinkedIn video posts.

### Secondary User

Technical/lifestyle creator who wants to rapidly ideate, script, generate assets, assemble content, and track performance inside one workspace.

### Future User

Small creator teams, social media managers, founder-led content teams, and agencies.

## 4. Product Vision

SceneBook Agent should become the creative project operator for the workspace.

The user should be able to say:

> Help me take this from idea to publish.

And the agent should know how to inspect the current project, identify missing context, ask only the highest-leverage questions, generate or refine the script, save structured outputs, build a shoot pack, generate or organize assets, prepare editor handoff, prepare publishing package, and later analyze performance.

## 5. Success Metrics

### User-Facing Metrics

- User can complete idea -> script -> asset plan in fewer manual steps.
- User trusts that workspace updates happened only when visible tool calls completed.
- User can resume a project without re-explaining context.
- User can see active goal, project stage, and next best action.

### Product Metrics

- Tool-call success rate.
- Tool-call failure clarity rate.
- Number of final responses with verified workspace changes.
- Reduction in repeated clarification questions.
- Completion rate for project workflows.
- Approval bypass incidents: must be zero.
- False workspace claim incidents: must be zero.

### Engineering Metrics

- Agent runtime route is thin.
- Agent kernel is unit-testable.
- Tool executor is shared across workflows.
- Trajectory tests cover major workflows.
- New tools can be added without editing the API route.

## 6. Core Use Cases

### UC1 — Project-aware brainstorming

User asks for ideas, angles, or hooks. Agent uses project context and returns options without mutating workspace unless asked.

Expected:
- 3-5 options.
- Recommendation.
- One high-leverage question.
- No false claim of saving.

### UC2 — Script generation and save

User asks for a script with enough context. Agent generates script package, critiques it, saves to Script Lab if safe, creates artifact/version, updates stage.

Expected:
- Tool events visible.
- Script Lab updated only after `update_script_lab` completes.
- Version/artifact stored.
- Final response summarizes exactly what changed.

### UC3 — Script improvement

User asks to critique or improve current script. Agent inspects current Script Lab, critiques, rewrites if requested, saves only if requested or safe.

Expected:
- Critique-only path does not mutate.
- Rewrite path creates draft/version.
- Save path uses approval if overwriting finalized material.

### UC4 — Natural language workspace control

User says things like:
- Make this the hook.
- Use this as CTA.
- Add these as tasks.
- Create a folder called Thumbnails.
- Move this asset to Thumbnails.

Expected:
- Agent identifies target.
- If clear, runs exact tool.
- If ambiguous, asks one clarifying question.
- No guessing destructive changes.

### UC5 — Asset generation

User asks for image/video/audio asset. Agent creates structured prompt JSON, selects model/modality, creates or reuses folder, generates asset, verifies persistence.

Expected:
- Prompt JSON generated.
- Asset generated through configured pipeline.
- Folder created/reused.
- Asset visible in project library.
- Final response includes model, folder, and next action.

### UC6 — Active goal

User asks for end-to-end help. Agent creates an active goal and tracks the project lifecycle.

Expected:
- Active goal visible in UI.
- Current stage visible.
- Completed steps recorded.
- Next suggested action updated after each meaningful step.

### UC7 — Editor handoff

Initial version may only prepare an editor handoff package. Later version can write to editor state.

Expected v1:
- Agent creates an editor handoff artifact with selected assets, sequence, shot notes, and pacing guidance.
- No claim of timeline mutation unless editor tool exists and completes.

### UC8 — Publishing preparation

Agent prepares caption, hashtags, media checklist, and posting notes.

Expected:
- Prepare package can be automatic.
- Actual publish/schedule requires approval and real integration.
- If integration is unavailable, agent says so clearly.

### UC9 — Analytics iteration

Agent reads analytics journal and prior project decisions, then suggests next iteration.

Expected:
- Summary of performance.
- Hypotheses.
- Follow-up content options.
- Optional creation of new follow-up project/task.

## 7. MVP Scope

### Included

- Runtime v3 agent kernel.
- Project snapshot builder.
- Structured decision engine.
- Tool registry and executor.
- Policy and approval engine.
- Creative Brief as canonical state.
- Active Goal as canonical state.
- Script workflow.
- Asset workflow.
- Workspace-control workflow.
- Tool events in UI.
- Approval UI integration.
- Trajectory tests.
- Docs and QA checklist.

### Deferred

- Fully autonomous editor timeline modification.
- Real Instagram publishing.
- Multi-agent specialist architecture.
- Background async jobs beyond normal request execution.
- Browser automation.
- Cross-project memory recommendations.
- Team collaboration permissions.

## 8. Product Principles

1. Workspace truth beats chat text.
2. Slash commands are hints, not the architecture.
3. No invisible mutations.
4. No final claim without verified tool result.
5. Ask fewer, better questions.
6. Draft automatically; publish/destruct only with approval.
7. Maintain versions, not overwrites.
8. Prefer domain-specific tools over raw database access.
9. Make the agent inspectable.
10. Keep the first production agent boring, reliable, and extensible.

## 9. Risks

### Product Risk

The agent may feel too cautious if it asks too many questions.

Mitigation:
- Use project defaults and assumptions when safe.
- Ask only high-leverage questions.
- Show assumptions when reasonable.

### Engineering Risk

The runtime can become another giant route.

Mitigation:
- Thin route rule.
- Runtime modules with tests.
- No workflow code inside API route.

### Trust Risk

Agent claims a change but data is not updated.

Mitigation:
- Tool verification step.
- Final response generated after tool observation.
- Tests for false workspace claims.

### Cost/Latency Risk

Agent loops may call the model too many times.

Mitigation:
- Max step count.
- Cheap deterministic checks before LLM.
- Use model decision only where needed.
- Stream progress events.

## 10. Launch Criteria

Runtime v3 can replace v2 when:

- All P0/P1 workflows pass automated trajectory tests.
- Tool approval flow works by exact tool execution.
- Creative Brief is canonical.
- Script workflow is fully state-aware.
- Asset workflow verifies saved assets.
- UI shows project goal, plan/tool events, and approval state clearly.
- No known false workspace claim bugs remain.
