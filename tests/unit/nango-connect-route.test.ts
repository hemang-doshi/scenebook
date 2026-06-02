import { beforeEach, describe, expect, test, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1", email: "user@example.com" } as { id: string; email?: string } | null,
  ownedProject: { id: "project-1", owner_id: "user-1" } as { id: string; owner_id: string } | null,
  upserts: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
}));

const nangoClientMock = vi.hoisted(() => ({
  createNangoConnectSession: vi.fn(),
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

vi.mock("@/lib/integrations/nango/client", () => ({
  createNangoConnectSession: nangoClientMock.createNangoConnectSession,
}));

describe("Nango connect route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NANGO_SECRET_KEY = "server-secret";
    process.env.NANGO_HOST = "https://api.nango.dev";
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";
    delete process.env.NEXT_PUBLIC_NANGO_SECRET_KEY;
    supabaseMock.authUser = { id: "user-1", email: "user@example.com" };
    supabaseMock.ownedProject = { id: "project-1", owner_id: "user-1" };
    supabaseMock.upserts = [];
    supabaseMock.inserts = [];
    nangoClientMock.createNangoConnectSession.mockResolvedValue({
      nangoIntegrationId: "scene-google-drive",
      connectSession: {
        token: "session-token",
        connectLink: "https://connect.nango.dev/?session_token=session-token",
        expiresAt: "2026-06-02T10:30:00.000Z",
      },
    });
  });

  test("connect route rejects unauthenticated user", async () => {
    supabaseMock.authUser = null;
    const { POST } = await import("@/app/api/integrations/[provider]/connect/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/connect", {
      method: "POST",
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(401);
  });

  test("connect route rejects unknown provider", async () => {
    const { POST } = await import("@/app/api/integrations/[provider]/connect/route");

    const response = await POST(new Request("http://localhost/api/integrations/dropbox/connect", {
      method: "POST",
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ provider: "dropbox" }) });

    expect(response.status).toBe(400);
  });

  test("connect route rejects project user who cannot manage integrations", async () => {
    supabaseMock.ownedProject = null;
    const { POST } = await import("@/app/api/integrations/[provider]/connect/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/connect", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-1" }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });

    expect(response.status).toBe(404);
    expect(nangoClientMock.createNangoConnectSession).not.toHaveBeenCalled();
  });

  test("connect route marks integration pending and records an event without leaking secrets", async () => {
    const { POST } = await import("@/app/api/integrations/[provider]/connect/route");

    const response = await POST(new Request("http://localhost/api/integrations/google_drive/connect", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-1" }),
    }), { params: Promise.resolve({ provider: "google_drive" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      provider: "google_drive",
      status: "pending",
      connectSession: {
        token: "session-token",
        connectLink: "https://connect.nango.dev/?session_token=session-token",
        expiresAt: "2026-06-02T10:30:00.000Z",
      },
      nango: {
        apiUrl: "https://api.nango.dev",
      },
    });
    expect(JSON.stringify(payload)).not.toContain("server-secret");
    expect(supabaseMock.upserts[0]).toMatchObject({
      owner_id: "user-1",
      project_id: "project-1",
      provider: "google_drive",
      status: "pending",
      metadata: {
        nangoIntegrationId: "scene-google-drive",
        connectedVia: "settings",
      },
    });
    expect(supabaseMock.inserts[0]).toMatchObject({
      owner_id: "user-1",
      provider: "google_drive",
      event_type: "connect_session_created",
      status: "pending",
    });
  });
});
