import { beforeEach, describe, expect, test, vi } from "vitest";

const adminMock = vi.hoisted(() => ({
  upserts: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  webhookValid: true,
}));

vi.mock("@/lib/integrations/nango/client", () => ({
  verifyNangoWebhookRequest: () => adminMock.webhookValid,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "integration_events") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            adminMock.inserts.push(payload);
            return { error: null };
          },
        };
      }

      return {
        upsert(payload: Record<string, unknown>) {
          adminMock.upserts.push(payload);
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
        update(payload: Record<string, unknown>) {
          adminMock.updates.push(payload);
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
                  connection_id: null,
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

describe("Nango webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NANGO_SECRET_KEY;
    adminMock.upserts = [];
    adminMock.updates = [];
    adminMock.inserts = [];
    adminMock.webhookValid = true;
  });

  test("webhook returns 503 when Nango is not configured", async () => {
    const { POST } = await import("@/app/api/integrations/nango/webhook/route");

    const response = await POST(new Request("http://localhost/api/integrations/nango/webhook", {
      method: "POST",
      body: JSON.stringify({
        type: "auth",
        tags: {
          end_user_id: "user-1",
          scenebook_provider: "google_drive",
        },
      }),
    }));

    expect(response.status).toBe(503);
    expect(adminMock.upserts).toEqual([]);
    expect(adminMock.inserts).toEqual([]);
  });

  test("invalid webhook signature returns 401 without writing", async () => {
    process.env.NANGO_SECRET_KEY = "server-secret";
    adminMock.webhookValid = false;
    const { POST } = await import("@/app/api/integrations/nango/webhook/route");

    const response = await POST(new Request("http://localhost/api/integrations/nango/webhook", {
      method: "POST",
      body: JSON.stringify({
        type: "auth",
        success: true,
        connectionId: "nango-connection-1",
        providerConfigKey: "scene-google-drive",
        tags: {
          end_user_id: "user-1",
          scenebook_provider: "google_drive",
        },
      }),
    }));

    expect(response.status).toBe(401);
    expect(adminMock.upserts).toEqual([]);
    expect(adminMock.inserts).toEqual([]);
  });

  test("valid webhook route records lifecycle event when enough attribution is present", async () => {
    process.env.NANGO_SECRET_KEY = "server-secret";
    const { POST } = await import("@/app/api/integrations/nango/webhook/route");

    const response = await POST(new Request("http://localhost/api/integrations/nango/webhook", {
      method: "POST",
      body: JSON.stringify({
        type: "auth",
        success: true,
        connectionId: "nango-connection-1",
        providerConfigKey: "scene-google-drive",
        tags: {
          end_user_id: "user-1",
          scenebook_provider: "google_drive",
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(adminMock.upserts[0]).toMatchObject({
      owner_id: "user-1",
      provider: "google_drive",
      connection_id: "nango-connection-1",
      status: "connected",
    });
    expect(adminMock.inserts[0]).toMatchObject({
      owner_id: "user-1",
      provider: "google_drive",
      event_type: "auth",
      status: "connected",
    });
  });

  test("webhook route accepts unattributed events without recording", async () => {
    process.env.NANGO_SECRET_KEY = "server-secret";
    const { POST } = await import("@/app/api/integrations/nango/webhook/route");

    const response = await POST(new Request("http://localhost/api/integrations/nango/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "auth" }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ accepted: true, recorded: false });
    expect(adminMock.inserts).toEqual([]);
  });
});
