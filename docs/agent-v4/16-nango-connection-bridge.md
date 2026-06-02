# Phase 11 Nango Connection Bridge

Phase 11 adds Nango as SceneBook's external account connection bridge. The scope is connection management only: users can start Nango Auth flows, SceneBook can track connection status, and credentials remain outside the SceneBook database.

## What This Adds

- server-only Nango configuration and client creation
- SceneBook provider to Nango integration id mapping
- connect session creation for settings-driven account linking
- status reconciliation after a successful Nango Connect UI flow
- a Nango webhook receiver skeleton for lifecycle events
- `integration_connections` status updates
- `integration_events` lifecycle logging

## What This Does Not Add

This phase does not expose Nango Functions, agent tools, external reads, external writes, publishing, media generation, or provider API calls. Google Drive, Calendar, YouTube, Instagram, and Notion remain unavailable to the agent runtime until later phases.

## Nango Auth

The connect endpoint creates a short-lived Nango connect session for the signed-in user. The frontend receives only safe fields such as the session token, expiration time, optional connect link, and Nango API URL.

`NANGO_SECRET_KEY` is server-only. `NEXT_PUBLIC_NANGO_SECRET_KEY` is rejected, and the secret is never returned to the browser.

## Provider Mapping

SceneBook providers map to Nango integration ids through environment variables:

- `NANGO_INTEGRATION_GOOGLE_DRIVE`
- `NANGO_INTEGRATION_GOOGLE_CALENDAR`
- `NANGO_INTEGRATION_YOUTUBE`
- `NANGO_INTEGRATION_INSTAGRAM`
- `NANGO_INTEGRATION_NOTION`

Unknown real Nango integration ids are not hardcoded in the repo.

## Connection Storage

SceneBook stores the Nango `connection_id`, status, scopes, and token-free metadata. Allowed metadata includes values such as:

- `nangoIntegrationId`
- `connectionLabel`
- `connectedVia`
- `lastSyncedAt`
- `providerAccountHint`

The store strips token-shaped metadata fields such as access tokens, refresh tokens, API keys, client secrets, and ID tokens.

`integration_connections` are user-level per provider. The unique connection identity is `owner_id, provider`; `project_id` is optional attribution/context for the flow that created or updated the row, not a separate per-project connection identity. Future project-specific integration settings should live in a separate table so the account connection remains distinct from project configuration.

## Phase 11.5 Hardening

Phase 11.5 tightens the connection bridge before any agent access:

- Nango webhooks fail closed unless webhook verification is configured and valid.
- The status route verifies a browser-reported Nango connection server-side before writing `connected`.
- Disconnect/revoke and health-check routes manage lifecycle state without exposing Nango secrets.
- The connect button can fall back to the Nango connect link if the frontend SDK path fails.

## Phase 11.6 DB Security Hardening

Phase 11.6 hardens the database trust boundary so future agent tools do not trust forgeable connection rows:

- Authenticated users can still read their own `integration_connections` and `integration_events`, but cannot directly insert, update, or delete connection state.
- Integration writes are service-role managed after route-level authentication and project authorization have already passed.
- `integration_events` are treated as append-only audit history from the user's perspective.
- `project_id` remains optional attribution/context and uses `ON DELETE SET NULL`, so deleting a project does not delete a user-level account connection or its lifecycle history.
- Provider values are constrained at the database layer to SceneBook's supported Nango-backed providers.
- Connected rows require a non-null Nango `connection_id`.
- Token-shaped metadata keys are blocked by database constraints and stripped defensively by the application store.
- `integration_connections.updated_at` is maintained by a database trigger.
- The redundant non-unique owner/provider index is removed because the unique owner/provider index already covers the lookup.

Status and health verification now check Nango ownership tags, not just connection existence. The connection must carry the signed-in user's `end_user_id`, the expected `scenebook_provider`, and, when project attribution is supplied, the expected `scenebook_project_id`.

## Event Logging

Connect session creation records `connect_session_created`. Successful status reconciliation records `connection_connected`. The webhook skeleton records lifecycle events when the payload contains enough SceneBook attribution, such as `tags.end_user_id` and `tags.scenebook_provider`.

## Why Agent Tools Wait

Connecting an account is lower risk than letting an agent operate that account. Phase 11.6 makes the stored connection state harder to forge before any read-only integration tools are added. External reads and writes still need a separate approval/resume layer, live event hardening, and exact stored action execution. Those belong to later phases, starting with read-only integration tools and then explicit external action approval.
