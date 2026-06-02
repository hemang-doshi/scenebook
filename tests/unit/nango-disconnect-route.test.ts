import { beforeEach, describe, expect, test, vi } from "vitest";

const routeMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  connections: [
    {
      id: "connection-1",
      owner_id: "user-1",
      project_id: null,
      provider: "google_drive",
      connection_id: "nango-connection-1",
      status: "connected",
      scopes: ["drive.file"],
      metadata: {},
      created_at: "2026-06-02T10:00:00.000Z",
      updated_at: "2026-06-02T10:00:00.000Z",
    },
  ] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  revoked: [] as Record<string, unknown>[],
  serverIntegrationWrites: [] as string[],
}));

vi.mock("@/lib/integrations/nango/client", () => ({
  revokeNangoConnection: async (input: Record<string, unknown>) => {
    routeMock.revoked.push(input);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: routeMock.authUser } }),
    },
    from: (table: string) => {
      return {
        select: () => ({
          eq() {
            return this;
          },
          order: async () => ({ data: routeMock.connections, error: null }),
        }),
        update() {
          routeMock.serverIntegrationWrites.push(table);
          throw new Error("disconnect route must use admin client for integration writes");
        },
      };
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "integration_events") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            routeMock.inserts.push(payload);
            return { error: null };
          },
        };
      }

      return {
        update(payload: Record<string, unknown>) {
          routeMock.updates.push(payload);
          return {
            eq() {
              return this;
            },
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "connection-1",
                  owner_id: "user-1",
                  project_id: null,
                  provider: "google_drive",
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
      };
    },
  }),
}));

describe("Nango disconnect route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";
    routeMock.authUser = { id: "user-1" };
    routeMock.connections = [
      {
        id: "connection-1",
        owner_id: "user-1",
        project_id: null,
        provider: "google_drive",
        connection_id: "nango-connection-1",
        status: "connected",
        scopes: ["drive.file"],
        metadata: {},
        created_at: "2026-06-02T10:00:00.000Z",
        updated_at: "2026-06-02T10:00:00.000Z",
      },
    ];
    routeMock.updates = [];
    routeMock.inserts = [];
    routeMock.revoked = [];
    routeMock.serverIntegrationWrites = [];
  });

  test("disconnect route requires auth", async () => {
    routeMock.authUser = null;
    const { POST } = await import("@/app/api/integrations/[provider]/disconnect/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/disconnect", {
      method: "POST",
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(401);
    expect(routeMock.revoked).toEqual([]);
    expect(routeMock.updates).toEqual([]);
  });

  test("disconnect route revokes connection and records event", async () => {
    const { POST } = await import("@/app/api/integrations/[provider]/disconnect/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/disconnect", {
      method: "POST",
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(200);
    expect(routeMock.revoked[0]).toEqual({
      nangoIntegrationId: "scene-google-drive",
      connectionId: "nango-connection-1",
    });
    expect(routeMock.updates[0]).toMatchObject({
      status: "revoked",
      connection_id: null,
      scopes: [],
    });
    expect(routeMock.inserts[0]).toMatchObject({
      owner_id: "user-1",
      provider: "google_drive",
      event_type: "connection_revoked",
      status: "revoked",
    });
    expect(routeMock.serverIntegrationWrites).toEqual([]);
  });
});
