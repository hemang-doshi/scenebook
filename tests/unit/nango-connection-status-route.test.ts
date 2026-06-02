import { beforeEach, describe, expect, test, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  ownedProject: { id: "project-1", owner_id: "user-1" } as { id: string; owner_id: string } | null,
  upserts: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  serverIntegrationWrites: [] as string[],
  verificationInputs: [] as Record<string, unknown>[],
  nangoConnectionVerified: true,
}));

vi.mock("@/lib/integrations/nango/client", () => ({
  verifyNangoConnectionOwnership: (input: Record<string, unknown>) => {
    supabaseMock.verificationInputs.push(input);
    return supabaseMock.nangoConnectionVerified;
  },
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
        upsert() {
          supabaseMock.serverIntegrationWrites.push(table);
          throw new Error("status route must use admin client for integration writes");
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
    supabaseMock.serverIntegrationWrites = [];
    supabaseMock.verificationInputs = [];
    supabaseMock.nangoConnectionVerified = true;
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
    expect(supabaseMock.serverIntegrationWrites).toEqual([]);
    expect(supabaseMock.verificationInputs[0]).toMatchObject({
      nangoIntegrationId: "scene-google-drive",
      connectionId: "nango-connection-1",
      userId: "user-1",
      provider: "google_drive",
      projectId: "project-1",
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

  test("status route does not mark connected without server-side Nango verification", async () => {
    supabaseMock.nangoConnectionVerified = false;
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        connectionId: "nango-connection-1",
        providerConfigKey: "scene-google-drive",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(409);
    expect(supabaseMock.upserts).toEqual([]);
    expect(supabaseMock.inserts).toEqual([]);
  });

  test("status route rejects Nango connection owned by a different user tag", async () => {
    supabaseMock.nangoConnectionVerified = false;
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        connectionId: "different-user-connection",
        providerConfigKey: "scene-google-drive",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(409);
    expect(supabaseMock.upserts).toEqual([]);
  });

  test("status route rejects Nango connection with mismatched scenebook_provider tag", async () => {
    supabaseMock.nangoConnectionVerified = false;
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        connectionId: "wrong-provider-connection",
        providerConfigKey: "scene-google-drive",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(409);
    expect(supabaseMock.upserts).toEqual([]);
  });

  test("status route rejects mismatched project tag when projectId is supplied", async () => {
    supabaseMock.nangoConnectionVerified = false;
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        projectId: "project-1",
        connectionId: "wrong-project-connection",
        providerConfigKey: "scene-google-drive",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(409);
    expect(supabaseMock.upserts).toEqual([]);
  });

  test("status route rejects mismatched provider config key", async () => {
    const { POST } = await import("@/app/api/integrations/[provider]/status/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/status", {
      method: "POST",
      body: JSON.stringify({
        connectionId: "nango-connection-1",
        providerConfigKey: "wrong-provider-config",
      }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(400);
    expect(supabaseMock.upserts).toEqual([]);
    expect(supabaseMock.inserts).toEqual([]);
  });
});
