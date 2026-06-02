import { beforeEach, describe, expect, test, vi } from "vitest";

const healthMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  connections: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  serverIntegrationWrites: [] as string[],
  verificationInputs: [] as Record<string, unknown>[],
  nangoConnectionVerified: true,
}));

vi.mock("@/lib/integrations/nango/client", () => ({
  verifyNangoConnectionOwnership: (input: Record<string, unknown>) => {
    healthMock.verificationInputs.push(input);
    return healthMock.nangoConnectionVerified;
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: healthMock.authUser } }),
    },
    from: (table: string) => {
      return {
        select: () => ({
          eq() {
            return this;
          },
          order: async () => ({ data: healthMock.connections, error: null }),
        }),
        update() {
          healthMock.serverIntegrationWrites.push(table);
          throw new Error("health route must use admin client for integration writes");
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
            healthMock.inserts.push(payload);
            return { error: null };
          },
        };
      }

      return {
        update(payload: Record<string, unknown>) {
          healthMock.updates.push(payload);
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
                  scopes: payload.scopes ?? [],
                  metadata: payload.metadata ?? {},
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

describe("Nango connection health route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";
    healthMock.authUser = { id: "user-1" };
    healthMock.connections = [];
    healthMock.updates = [];
    healthMock.inserts = [];
    healthMock.serverIntegrationWrites = [];
    healthMock.verificationInputs = [];
    healthMock.nangoConnectionVerified = true;
  });

  test("health route returns not_connected when no row exists", async () => {
    const { GET } = await import("@/app/api/integrations/[provider]/health/route");

    const response = await GET(new Request("http://localhost/api/integrations/google_drive/health"), {
      params: Promise.resolve({ provider: "google_drive" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ provider: "google_drive", status: "not_connected" });
    expect(healthMock.inserts[0]).toMatchObject({
      owner_id: "user-1",
      provider: "google_drive",
      event_type: "connection_health_checked",
      status: "not_connected",
    });
    expect(healthMock.serverIntegrationWrites).toEqual([]);
  });

  test("health route marks failed when Nango says connection invalid", async () => {
    healthMock.nangoConnectionVerified = false;
    healthMock.connections = [
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
    const { GET } = await import("@/app/api/integrations/[provider]/health/route");

    const response = await GET(new Request("http://localhost/api/integrations/google_drive/health"), {
      params: Promise.resolve({ provider: "google_drive" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ provider: "google_drive", status: "failed" });
    expect(healthMock.updates[0]).toMatchObject({
      status: "failed",
      connection_id: null,
    });
    expect(healthMock.inserts[0]).toMatchObject({
      event_type: "connection_health_checked",
      status: "failed",
    });
    expect(healthMock.verificationInputs[0]).toMatchObject({
      nangoIntegrationId: "scene-google-drive",
      connectionId: "nango-connection-1",
      userId: "user-1",
      provider: "google_drive",
    });
    expect(healthMock.serverIntegrationWrites).toEqual([]);
  });

  test("health route marks failed for Nango ownership tag mismatch", async () => {
    healthMock.nangoConnectionVerified = false;
    healthMock.connections = [
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
    const { GET } = await import("@/app/api/integrations/[provider]/health/route");

    const response = await GET(new Request("http://localhost/api/integrations/google_drive/health"), {
      params: Promise.resolve({ provider: "google_drive" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ provider: "google_drive", status: "failed" });
    expect(healthMock.updates[0]).toMatchObject({ status: "failed" });
  });
});
