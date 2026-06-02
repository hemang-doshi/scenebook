import { beforeEach, describe, expect, test, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  ownedProject: { id: "project-1", owner_id: "user-1" } as { id: string; owner_id: string } | null,
  upserts: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supabaseMock.authUser } }),
    },
    from: (table: string) => {
      if (table === "content_cards") {
        return {
          select: () => ({
            eq() {
              return this;
            },
            maybeSingle: async () => ({ data: supabaseMock.ownedProject, error: null }),
          }),
        };
      }

      if (table === "integration_events") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            supabaseMock.inserts.push(payload);
            return { error: null };
          },
        };
      }

      return {
        upsert(payload: Record<string, unknown>) {
          supabaseMock.upserts.push(payload);
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
      };
    },
  }),
}));

describe("Nango connection status route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";
    supabaseMock.authUser = { id: "user-1" };
    supabaseMock.ownedProject = { id: "project-1", owner_id: "user-1" };
    supabaseMock.upserts = [];
    supabaseMock.inserts = [];
  });

  test("status route marks connected with Nango connection id", async () => {
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-1",
        connectionId: "nango-connection-1",
        providerConfigKey: "scene-google-drive",
        ownerId: "attacker-user",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(200);
    expect(supabaseMock.upserts[0]).toMatchObject({
      owner_id: "user-1",
      project_id: "project-1",
      provider: "google_drive",
      connection_id: "nango-connection-1",
      status: "connected",
    });
    expect(supabaseMock.inserts[0]).toMatchObject({
      owner_id: "user-1",
      event_type: "connection_connected",
      status: "connected",
    });
  });

  test("status route never accepts client-supplied owner id", async () => {
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        connectionId: "nango-connection-1",
        ownerId: "attacker-user",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(supabaseMock.upserts[0].owner_id).toBe("user-1");
  });
});
