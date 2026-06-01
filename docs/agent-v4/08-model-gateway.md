# Phase 6.5: AI SDK Model Gateway

Phase 6.5 gives Agent Runtime v4 a provider-neutral model layer at
`lib/ai/model-gateway`. LangGraph nodes and decision code call SceneBook-owned
helpers in `lib/agent/runtime-v4/model.ts` instead of importing provider SDKs.

## Why AI SDK

The Vercel AI SDK is used for model invocation, streaming text, structured
outputs, provider adapters, usage metadata, warnings, and provider-level errors.
SceneBook keeps the orchestration and safety layers outside the SDK.

AI SDK owns:

- Provider adapters for Google Gemini and OpenAI-compatible NVIDIA NIM.
- `generateText`, `streamText`, and structured output generation.
- Model switching through profile resolution.
- Usage, finish reason, warnings, and provider metadata normalization.
- Test compatibility through the fake gateway.

SceneBook still owns:

- LangGraph orchestration.
- ProjectMind memory loading and summarization.
- Tool runtime and approval policy.
- ProjectPatch generation and verification in the next phase.
- Workspace mutation, publishing decisions, and Nango integration permissions.

## Provider Boundaries

Gemini and NIM are infrastructure model providers, not creator account
integrations. They are configured with server-side API keys and used by the
agent runtime to think, classify, draft, critique, and compose responses.

Nango remains the future layer for user-connected app accounts such as Google
Drive, Calendar, Notion, Instagram, or YouTube. It should not be used for normal
Gemini or NIM model calls.

The AI SDK ToolLoopAgent is also not the main SceneBook runtime. SceneBook needs
its own policy checks, ProjectPatch verification, approval handling, trace
records, and later Nango authorization boundaries. AI SDK tool calling can be
evaluated later for isolated helper flows, but LangGraph remains the runtime
orchestrator.

## Model Profiles

Runtime code selects a profile, not a provider directly:

- `structured_extraction` for intent understanding.
- `agent_decision` for the next graph decision.
- `creative_generation` for high-temperature creative drafting.
- `critique` for goal checks and review-style structured outputs.
- `final_response` for user-facing response composition.
- `test_fake` for deterministic tests and local smoke runs.

`resolveModelProfile()` maps each profile to provider, model, temperature,
token budget, and structured-output capability. Setting
`AGENT_MODEL_PROFILE=test_fake` routes profiles through the fake provider so no
real API calls happen.

## Gemini Configuration

Use either of these server-side variables:

```bash
AGENT_DEFAULT_MODEL_PROVIDER=google
AGENT_DEFAULT_MODEL=gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=...
# or
GEMINI_API_KEY=...
```

Do not expose provider keys through `NEXT_PUBLIC_` variables.

## NIM Configuration

NVIDIA NIM uses the AI SDK OpenAI-compatible provider:

```bash
AGENT_DEFAULT_MODEL_PROVIDER=nim
NIM_API_KEY=...
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
AGENT_NIM_MODEL=meta/llama-3.1-70b-instruct
```

NIM is optional. If it is selected without `NIM_API_KEY`, the gateway throws a
recoverable `ModelConfigurationError`.

## Fake Provider Tests

The fake gateway supports deterministic text, structured output, streaming
chunks, scenario-specific profile responses, and malformed structured output
simulation. Runtime tests use this provider to verify LangGraph behavior without
network access or provider credentials.

Example smoke setup:

```bash
AGENT_ORCHESTRATOR=langgraph
AGENT_MODEL_PROFILE=test_fake
```

With that configuration, a prompt like "Help me make a reel about building
SceneBook" loads ProjectMind, calls the fake model gateway, produces a
deterministic plan/final response, and performs no workspace mutation.
