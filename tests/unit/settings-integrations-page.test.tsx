import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SettingsIntegrationsPage from "@/app/settings/integrations/page";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  rows: [] as Array<Record<string, unknown>>,
}));

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supabaseMock.authUser } }),
    },
    from: () => ({
      select: () => ({
        eq() {
          return this;
        },
        order: async () => ({ data: supabaseMock.rows, error: null }),
      }),
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@nangohq/frontend", () => ({
  default: vi.fn().mockImplementation(() => ({
    openConnectUI: vi.fn(),
  })),
}));

describe("settings integrations page", () => {
  beforeEach(() => {
    supabaseMock.authUser = { id: "user-1" };
    supabaseMock.rows = [];
    delete process.env.NANGO_SECRET_KEY;
    delete process.env.NANGO_INTEGRATION_GOOGLE_DRIVE;
  });

  test("settings integrations page renders disabled cards when Nango is not configured", async () => {
    render(await SettingsIntegrationsPage());

    for (const name of ["Google Drive", "Google Calendar", "YouTube", "Instagram", "Notion"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    expect(screen.getAllByText("not connected")).toHaveLength(5);
    expect(screen.getAllByText(/Configure Nango environment values/i)).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /connection unavailable/i }))
      .toHaveLength(5);
  });

  test("settings integrations page shows Connect when Nango is configured", async () => {
    process.env.NANGO_SECRET_KEY = "server-secret";
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";

    render(await SettingsIntegrationsPage());

    expect(screen.getByRole("button", { name: "Connect Google Drive" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Google Calendar connection unavailable" })).toBeDisabled();
  });

  test("settings integrations page renders connection statuses from store rows", async () => {
    supabaseMock.rows = [
      {
        id: "connection-1",
        owner_id: "user-1",
        project_id: null,
        provider: "google_drive",
        connection_id: "future-nango-id",
        status: "connected",
        scopes: [],
        metadata: {},
        created_at: "2026-06-02T10:00:00.000Z",
        updated_at: "2026-06-02T10:00:00.000Z",
      },
      {
        id: "connection-2",
        owner_id: "user-1",
        project_id: null,
        provider: "notion",
        connection_id: null,
        status: "pending",
        scopes: [],
        metadata: {},
        created_at: "2026-06-02T10:00:00.000Z",
        updated_at: "2026-06-02T10:00:00.000Z",
      },
      {
        id: "connection-3",
        owner_id: "user-1",
        project_id: null,
        provider: "instagram",
        connection_id: null,
        status: "revoked",
        scopes: [],
        metadata: {},
        created_at: "2026-06-02T10:00:00.000Z",
        updated_at: "2026-06-02T10:00:00.000Z",
      },
    ];

    render(await SettingsIntegrationsPage());

    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("revoked")).toBeInTheDocument();
  });
});
