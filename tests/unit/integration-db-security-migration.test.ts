import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260602110000_harden_integration_connection_security.sql"),
  "utf8",
);

describe("integration DB security migration", () => {
  test("keeps authenticated select policies but removes authenticated write policies", () => {
    expect(migration).toContain('drop policy if exists "Users can insert own integration connections"');
    expect(migration).toContain('drop policy if exists "Users can update own integration connections"');
    expect(migration).toContain('drop policy if exists "Users can delete own integration connections"');
    expect(migration).toContain("revoke insert, update, delete on table public.integration_connections from authenticated");
    expect(migration).not.toContain('drop policy if exists "Users can read own integration connections"');
  });

  test("makes integration events service-managed and immutable to authenticated users", () => {
    expect(migration).toContain('drop policy if exists "Users can insert own integration events"');
    expect(migration).toContain('drop policy if exists "Users can update own integration events"');
    expect(migration).toContain('drop policy if exists "Users can delete own integration events"');
    expect(migration).toContain("revoke insert, update, delete on table public.integration_events from authenticated");
    expect(migration).toContain('create policy "Service role can manage integration events"');
  });

  test("changes project attribution foreign keys to set null on delete", () => {
    expect(migration).toMatch(/foreign key \(project_id\)[\s\S]+?references public\.content_cards\(id\)[\s\S]+?on delete set null/);
  });

  test("adds provider, connected-state, and token metadata constraints", () => {
    expect(migration).toContain("integration_connections_provider_check");
    expect(migration).toContain("integration_events_provider_check");
    expect(migration).toContain("provider in ('google_drive', 'google_calendar', 'youtube', 'instagram', 'notion')");
    expect(migration).toContain("integration_connections_connected_requires_connection_id");
    expect(migration).toContain("status <> 'connected' or connection_id is not null");
    expect(migration).toContain("integration_connections_no_token_metadata");
    expect(migration).toContain("integration_events_no_token_metadata");
    expect(migration).toContain("'access_token'");
    expect(migration).toContain("'refreshToken'");
    expect(migration).toContain("'clientSecret'");
  });

  test("drops the redundant owner/provider index and adds an updated_at trigger", () => {
    expect(migration).toContain("drop index if exists public.idx_integration_connections_owner_provider");
    expect(migration).toContain("create trigger set_integration_connections_updated_at");
    expect(migration).toContain("before update on public.integration_connections");
  });
});
