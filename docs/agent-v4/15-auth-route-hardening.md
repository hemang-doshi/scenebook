# Phase 10.5 Auth Route Hardening

Phase 10.5 hardens the Phase 10 account foundation before adding external integrations.

## Route-Level Ownership

The agent history route now loads `AccountContext` immediately after authentication. A user must own the project before the route can list threads, load history, or hydrate runtime-v4 timeline entries.

The runtime-v4 POST harness path also loads `AccountContext` before calling `AgentKernel.run()`. Inaccessible projects continue to return the existing `404 Project not found.` style response.

## Runtime-V4 Account Context

`AccountContext` and `PermissionSummary` now flow through:

- `AgentKernel.run()` input
- LangGraph runtime input and state
- graph step execution context
- direct tool execution
- ProjectPatch execution
- workflow execution

This does not rewrite workspace tools. It makes the permission context available where future integration tools will need checks such as `canManageIntegrations`.

## Integration Store Primitives

The integration connection store now has placeholder write helpers:

- `upsertIntegrationConnection`
- `markIntegrationPending`
- `markIntegrationConnected`
- `markIntegrationFailed`
- `revokeIntegrationConnection`
- `recordIntegrationEvent`

These helpers require `ownerId`, validate providers against the placeholder registry, and store only metadata, scopes, status, and a future `connectionId`. They do not store OAuth tokens, refresh tokens, provider API keys, or Nango credentials.

## Account-Aware Settings Page

The settings integrations page now requires a signed-in user and reads that user's integration connection rows. Provider cards show actual `pending`, `connected`, `failed`, or `revoked` status when rows exist.

Connect buttons remain disabled. Live connection management still waits for the Nango bridge phase.

## Server-Only Model Secrets

Google/Gemini and NIM model gateway providers now use `getGeminiApiKey()` and `getNimApiKey()`. Those helpers reject public env vars such as `NEXT_PUBLIC_GEMINI_API_KEY` and `NEXT_PUBLIC_NIM_API_KEY`, keeping model provider credentials server-only.

## Why Nango Is Deferred

This phase intentionally does not add the Nango SDK, OAuth connect sessions, external provider API calls, publishing, or media generation. It only makes the account boundary enforceable at runtime and prepares safe placeholder storage for the next bridge phase.
