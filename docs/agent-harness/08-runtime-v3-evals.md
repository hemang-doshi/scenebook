# Runtime-v3 Trajectory Evals

Phase 8A adds deterministic trajectory evals for the runtime-v3 harness. These evals validate the path the agent takes, not only the final text.

## What The Runner Checks

- Decision type and workflow routing.
- Tool sequence and tool statuses.
- Waiting-for-user behavior.
- Final response includes and excludes.
- Truthfulness rules for approval, blocked tools, failed tools, editor handoff, and no-mutation asks.

## Files

- `lib/agent/runtime-v3/evals/types.ts` defines fixture and result types.
- `lib/agent/runtime-v3/evals/fixtures.ts` contains T-001 through T-015 from the QA spec.
- `lib/agent/runtime-v3/evals/trajectory-runner.ts` runs one fixture through `decideNextStep` and `runWorkflow`.
- `tests/unit/agent-runtime-v3-evals.test.ts` mocks tool execution and asserts every fixture passes.

## Running

```bash
npm.cmd test -- tests/unit/agent-runtime-v3-evals.test.ts
npm.cmd test -- tests/unit/agent-runtime-v3-evals.test.ts tests/unit/agent-runtime-v3.test.ts tests/unit/agent-runtime-v3-workflows.test.ts
```

## Adding A Fixture

Add a `TrajectoryFixture` to `runtimeV3TrajectoryFixtures` with:

- a stable `T-###` id,
- the user input,
- a complete `ProjectSnapshot`,
- expected decision/workflow,
- expected tool sequence and statuses,
- final-response truthfulness constraints.

Keep fixtures offline. Mock provider, database, media, and browser behavior in tests rather than calling external services.

## Interpreting Failures

Trajectory failures point at the contract that changed:

- decision/workflow failures mean routing changed before tools ran,
- tool failures mean the workflow emitted a different mutation or status,
- waiting-for-user failures mean an ask-versus-act boundary changed,
- final-response failures mean the user-facing claim no longer matches the expected outcome,
- truthfulness failures mean the response implies a mutation, publish, approval, or editor capability that the observed tools did not prove.

Update fixtures only when the intended product behavior changed. Otherwise fix the decision heuristic, workflow, or final response that drifted.
