import { describe, expect, test } from "vitest";

import { listIntegrationProviders } from "@/lib/integrations/connections/registry";
import {
  listIntegrationConnections,
  listPlaceholderIntegrationProviders,
  markIntegrationConnected,
  markIntegrationPending,
  recordIntegrationEvent,
  revokeIntegrationConnection,
} from "@/lib/integrations/connections/store";

describe("integration connection placeholders", () => {
  test("integration provider registry marks providers as requiresNango", () => {
    const providers = listIntegrationProviders();

    expect(providers.map((provider) => provider.provider)).toEqual([
      "google_drive",
      "google_calendar",
      "youtube",
      "instagram",
      "notion",
    ]);
    expect(providers.every((provider) => provider.status === "placeholder")).toBe(true);
    expect(providers.every((provider) => provider.requiresNango)).toBe(true);
  });

  test("integration connection store lists placeholder providers", () => {
    expect(listPlaceholderIntegrationProviders()).toEqual(listIntegrationProviders());
  });

  test("integration connection store never exposes token fields", async () => {
    const row = {
      id: "connection-1",
      owner_id: "user-1",
      project_id: null,
      provider: "google_drive",
      connection_id: "future-nango-id",
      status: "connected" as const,
      scopes: ["drive.file"],
      metadata: { label: "Drive" },
      created_at: "2026-06-02T10:00:00.000Z",
      updated_at: "2026-06-02T10:00:00.000Z",
    };
    const supabase = {
      from: () => ({
        select: () => ({
          eq() {
            return this;
          },
          order: async () => ({ data: [row], error: null }),
        }),
      }),
    };

    const connections = await listIntegrationConnections({ supabase: supabase as never, ownerId: "user-1" });

    expect(connections).toEqual([
      {
        id: "connection-1",
        ownerId: "user-1",
        projectId: null,
        provider: "google_drive",
        connectionId: "future-nango-id",
        status: "connected",
        scopes: ["drive.file"],
        metadata: { label: "Drive" },
        createdAt: "2026-06-02T10:00:00.000Z",
        updatedAt: "2026-06-02T10:00:00.000Z",
      },
    ]);
    expect(Object.keys(connections[0])).not.toContain("accessToken");
    expect(Object.keys(connections[0])).not.toContain("refreshToken");
    expect(Object.keys(connections[0])).not.toContain("apiKey");
  });

  test("integration connection store strips forbidden token metadata fields", async () => {
    const upserted: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        upsert(payload: Record<string, unknown>) {
          upserted.push(payload);
          return {
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "connection-1",
                  owner_id: payload.owner_id,
                  project_id: payload.project_id,
                  provider: payload.provider,
                  connection_id: payload.connection_id,
                  status: payload.status,
                  scopes: payload.scopes,
                  metadata: payload.metadata,
                  created_at: "2026-06-02T10:00:00.000Z",
                  updated_at: "2026-06-02T10:00:00.000Z",
                },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    await markIntegrationPending({
      supabase: supabase as never,
      ownerId: "user-1",
      provider: "google_drive",
      metadata: {
        nangoIntegrationId: "scene-google-drive",
        access_token: "secret-access-token",
        refreshToken: "secret-refresh-token",
        api_key: "secret-api-key",
        client_secret: "secret-client",
        idToken: "secret-id-token",
      },
    });

    expect(upserted[0].metadata).toEqual({
      nangoIntegrationId: "scene-google-drive",
    });
  });

  test("integration store can upsert pending connection without token fields", async () => {
    const upserted: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        upsert(payload: Record<string, unknown>) {
          upserted.push(payload);
          return {
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "connection-1",
                  owner_id: payload.owner_id,
                  project_id: payload.project_id,
                  provider: payload.provider,
                  connection_id: payload.connection_id,
                  status: payload.status,
                  scopes: payload.scopes,
                  metadata: payload.metadata,
                  created_at: "2026-06-02T10:00:00.000Z",
                  updated_at: "2026-06-02T10:00:00.000Z",
                },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    const connection = await markIntegrationPending({
      supabase: supabase as never,
      ownerId: "user-1",
      provider: "google_drive",
      scopes: ["drive.file"],
      metadata: { label: "Drive" },
    });

    expect(connection.status).toBe("pending");
    expect(upserted[0]).toMatchObject({
      owner_id: "user-1",
      provider: "google_drive",
      connection_id: null,
      status: "pending",
      scopes: ["drive.file"],
      metadata: { label: "Drive" },
    });
    expect(Object.keys(upserted[0])).not.toContain("accessToken");
    expect(Object.keys(upserted[0])).not.toContain("refreshToken");
    expect(Object.keys(upserted[0])).not.toContain("apiKey");
  });

  test("integration store can mark connected with future connectionId", async () => {
    const supabase = {
      from: () => ({
        upsert(payload: Record<string, unknown>) {
          return {
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "connection-1",
                  owner_id: payload.owner_id,
                  project_id: payload.project_id,
                  provider: payload.provider,
                  connection_id: payload.connection_id,
                  status: payload.status,
                  scopes: payload.scopes,
                  metadata: payload.metadata,
                  created_at: "2026-06-02T10:00:00.000Z",
                  updated_at: "2026-06-02T10:00:00.000Z",
                },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    const connection = await markIntegrationConnected({
      supabase: supabase as never,
      ownerId: "user-1",
      provider: "notion",
      connectionId: "future-nango-connection",
    });

    expect(connection).toMatchObject({
      status: "connected",
      connectionId: "future-nango-connection",
      provider: "notion",
    });
  });

  test("integration store can revoke connection", async () => {
    const updates: Record<string, unknown>[] = [];
    const chain = {
      eq() {
        return this;
      },
      select: () => ({
        maybeSingle: async () => ({
          data: {
            id: "connection-1",
            owner_id: "user-1",
            project_id: null,
            provider: "instagram",
            connection_id: null,
            status: "revoked",
            scopes: [],
            metadata: { reason: "user_requested" },
            created_at: "2026-06-02T10:00:00.000Z",
            updated_at: "2026-06-02T10:00:00.000Z",
          },
          error: null,
        }),
      }),
    };
    const supabase = {
      from: () => ({
        update(payload: Record<string, unknown>) {
          updates.push(payload);
          return chain;
        },
      }),
    };

    const connection = await revokeIntegrationConnection({
      supabase: supabase as never,
      ownerId: "user-1",
      provider: "instagram",
      metadata: { reason: "user_requested" },
    });

    expect(connection.status).toBe("revoked");
    expect(updates[0]).toMatchObject({
      status: "revoked",
      connection_id: null,
      scopes: [],
      metadata: { reason: "user_requested" },
    });
  });

  test("integration store can record integration event", async () => {
    const inserted: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          inserted.push(payload);
          return { error: null };
        },
      }),
    };

    await recordIntegrationEvent({
      supabase: supabase as never,
      ownerId: "user-1",
      provider: "youtube",
      eventType: "connection_pending",
      status: "pending",
      metadata: { source: "settings" },
    });

    expect(inserted).toEqual([
      expect.objectContaining({
        owner_id: "user-1",
        provider: "youtube",
        event_type: "connection_pending",
        status: "pending",
        metadata: { source: "settings" },
      }),
    ]);
  });
});
