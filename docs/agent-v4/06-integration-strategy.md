# Integration Strategy - SceneBook Agent v4

## 1. Strategy Overview

SceneBook Agent v4 should integrate with external systems through typed tools and Nango-backed connections. The agent runtime should reason about capabilities and connection state, but provider-specific OAuth and API details must stay outside the core agent loop.

The integration strategy has four pillars:

1. Google auth is the user identity layer.
2. Nango is the external integration bridge.
3. The model gateway owns model-provider access, including Gemini.
4. Typed tools and approval policies guard every external side effect.

## 2. Google Auth As User Identity

Google auth provides the identity used by the agent runtime.

Identity responsibilities:

- authenticate the user,
- authorize project access,
- attribute agent runs,
- attribute ProjectPatch authorship,
- attribute approvals and rejections,
- find user-owned Nango connections,
- enforce user-scoped integration access,
- support audit logs.

The runtime should receive a normalized identity object:

```ts
type AgentIdentity = {
  userId: string;
  email?: string;
  displayName?: string;
  provider: "google";
  authSessionId: string;
};
```

The runtime should not depend on Google SDK details outside the identity boundary.

## 3. Nango As External Integration Bridge

Nango manages OAuth connections, token refresh, and provider-specific auth details for external services.

Agent v4 should use Nango for:

- connection discovery,
- connection health,
- scoped external API access,
- reconnect flows,
- provider account metadata,
- token lifecycle isolation.

The runtime should not expose OAuth tokens to prompts, UI events, traces, or eval outputs.

## 4. Integration Capability Model

The agent should reason over capabilities, not raw provider APIs.

Conceptual capability:

```ts
type IntegrationCapability = {
  provider: string;
  connectionId: string;
  accountLabel: string;
  status: "connected" | "disconnected" | "expired" | "missing_scope" | "error";
  capabilities: string[];
  lastCheckedAt: string;
};
```

Examples:

- `google_drive.read_files`,
- `google_drive.write_files`,
- `youtube.upload_draft`,
- `youtube.schedule_publish`,
- `notion.create_page`,
- `slack.send_message`,
- `instagram.prepare_publish`,
- `tiktok.prepare_publish`.

The first production launch should expose only capabilities that have typed tools, tests, and approval policies.

## 5. Integration Tool Contract

External tools must use the same typed tool runtime as internal tools.

Required metadata:

- provider,
- required capability,
- required scopes,
- side effect category,
- approval policy,
- timeout,
- idempotency key support,
- verification strategy,
- redaction strategy.

Example:

```ts
type ExternalIntegrationTool = AgentTool<Input, Output> & {
  requiredIntegration: {
    provider: "google_drive" | "youtube" | "notion" | "slack" | string;
    capability: string;
  };
};
```

## 6. Approval Policy For Integrations

Default external approval policy:

| Integration Action | Policy |
|---|---|
| Read external metadata | Auto if connected and scoped |
| Import selected file metadata | Auto if user selected file |
| Import file contents | Ask if sensitive or broad |
| Create external draft | Ask if external side effect |
| Upload media draft | Always ask |
| Schedule post | Always ask |
| Publish post | Always ask |
| Send message | Always ask |
| Delete external object | Always ask |
| Change account settings | Block for v4 launch |

The approval prompt must show provider, account label, exact action, target object, and expected result.

## 7. Disconnected And Expired Connections

If an integration is disconnected, expired, or missing scope, the agent must:

1. Stop before calling the external tool.
2. Explain which connection is needed.
3. Offer the UI path to connect or reconnect.
4. Avoid claiming the requested action happened.

The agent may still prepare internal draft artifacts that do not require the external connection.

Example:

User asks: "Schedule this Short on YouTube."

Expected:

- Prepare publish package if possible.
- Detect YouTube connection is missing.
- Ask user to connect YouTube.
- Do not schedule.

## 8. Model Gateway Integration

All model calls go through the model gateway.

Provider integrations:

- default text and structured-decision provider,
- Gemini provider for configured roles,
- future image, audio, and video model providers,
- eval judge models.

Gateway requirements:

- provider-neutral request interface,
- model-role routing,
- structured output validation,
- retry and fallback policy,
- latency, token, and cost telemetry,
- provider error normalization,
- trace redaction.

Gemini support should be implemented as a normal gateway provider, not special workflow code.

## 9. Asset And Storage Integrations

SceneBook video production depends on media assets. Asset integrations should distinguish:

- imported assets,
- generated assets,
- linked external assets,
- user-uploaded assets,
- editor handoff references.

All asset tools must verify:

- storage object exists or external reference is valid,
- project attachment exists,
- asset metadata is persisted,
- provenance is recorded,
- generation prompt and provider are traceable.

Paid or high-cost generation should be approval-gated by policy.

## 10. Publishing Integrations

Publishing is a high-risk side effect.

Agent v4 should separate:

- internal publish package preparation,
- external draft upload,
- external scheduling,
- external publishing.

Only internal publish package preparation can be automatic. External upload, scheduling, and publishing require approval and verified integration capability.

Publishing tool outputs must include provider response IDs when available.

## 11. Editor Integrations

Direct timeline editing is deferred until a safe editor mutation tool exists.

Initial strategy:

- create editor handoff artifacts,
- reference selected assets,
- generate sequence and timing notes,
- export structured handoff data for future editor tools.

When editor mutation tools are added, they must use ProjectPatch, approval policies, typed tool verification, and trajectory tests. The agent must never claim it modified a timeline unless a real editor mutation tool verifies the change.

## 12. Integration Observability

Integration traces must record:

- provider,
- capability,
- connection status,
- approval ID if applicable,
- request metadata,
- provider response metadata,
- latency,
- error class,
- redacted external object IDs where safe,
- verification result.

Traces must not record raw tokens, refresh tokens, secrets, or full sensitive payloads unless explicitly allowed by retention policy.

## 13. Integration Testing

Required tests:

- disconnected connection blocks external action,
- expired connection prompts reconnect,
- missing scope prompts reconnect or scope upgrade,
- approval required before external side effect,
- approved external action executes exact input,
- provider error surfaces safely,
- verification failure blocks success claim,
- tokens are redacted from traces.

Nango adapter tests should use mocked Nango responses. Provider contract tests can run against recorded fixtures or sandbox accounts where available.

## 14. Initial Integration Priorities

Recommended order:

1. Google auth identity normalization.
2. Model gateway with Gemini support.
3. Nango connection-state read.
4. Google Drive import or reference tools.
5. YouTube publish-package and draft-upload exploration.
6. Notion export or reference tools if creator workflows require it.
7. Slack or team notification tools for later team workflows.
8. Platform publishing tools only after approval policy and traces are proven.

## 15. Production Guardrails

- No raw tokens in prompts.
- No external side effect without typed tool execution.
- No publish or schedule without approval.
- No integration action without connection state.
- No success claim without provider confirmation or explicit verification.
- No direct provider SDK calls from runtime workflows.
- No broad scopes when narrow scopes are enough.
- No irreversible external operations in the first beta.
