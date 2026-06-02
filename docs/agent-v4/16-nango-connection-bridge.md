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

## Event Logging

Connect session creation records `connect_session_created`. Successful status reconciliation records `connection_connected`. The webhook skeleton records lifecycle events when the payload contains enough SceneBook attribution, such as `tags.end_user_id` and `tags.scenebook_provider`.

## Why Agent Tools Wait

Connecting an account is lower risk than letting an agent operate that account. External reads and writes need a separate approval/resume layer, live event hardening, and exact stored action execution. Those belong to later phases, starting with read-only integration tools and then explicit external action approval.
