# Auth and Account Foundation

Phase 10 defines the identity and permission boundary that future external integrations will use. It does not add Nango, OAuth connect sessions, external API calls, publishing, or media generation.

## SceneBook Identity

The signed-in Supabase auth user is the SceneBook identity. Server routes should load it through `getServerUser()` or `requireServerUser()` from `lib/auth/server-user.ts` instead of repeating route-local auth checks.

## Project Ownership

Projects currently map to `content_cards`. Ownership is derived from `content_cards.owner_id`. `requireOwnedProject()` centralizes the owner-only check and preserves the existing non-owner behavior by treating inaccessible projects as not found.

## Account Context

`loadAccountContext()` returns the current user, optional project, `workspaceId: null`, role, and permission summary. Team and workspace membership are intentionally not invented in this phase. For owned projects the role is `owner`, with permissions to read, write, apply patches, and manage integrations.

## Model Provider Secrets

Gemini and NIM credentials are app infrastructure secrets. They must stay server-only and must not use `NEXT_PUBLIC_` environment names. `lib/ai/secrets.ts` provides `getGeminiApiKey()`, `getNimApiKey()`, and `assertServerOnlyModelSecrets()` to formalize that boundary.

## User Integrations

External apps such as Google Drive, Google Calendar, YouTube, Instagram, and Notion are user or workspace-connected accounts. Their credentials are not model provider secrets. Phase 10 stores only placeholder connection metadata and a future `connection_id`; it does not store OAuth tokens or provider API keys.

## Why Nango Is Deferred

Nango becomes useful once SceneBook has a stable account context, ownership helper, placeholder schema, and settings surface. Phase 11 can add the Nango bridge without mixing identity modeling with OAuth mechanics.

## Placeholder Schema

`integration_connections` tracks provider, owner, optional project, status, scopes, metadata, and a nullable `connection_id` reserved for a future Nango connection id. `integration_events` records provider events and statuses. Row-level security limits rows to `owner_id = auth.uid()`.

## Future External Approval

Before any external write or publish action is enabled, the existing approval work must become a complete review, approve, and resume flow. Integration tools should receive `AccountContext` or the permission summary through runtime-v4 policy/tool context and should continue to block destructive or unapproved external actions.
