import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SettingsPage from "@/app/(workspace)/settings/page";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  rows: [] as Array<Record<string, unknown>>,
}));

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const fetcherMock = vi.hoisted(() => ({
  fetchJson: vi.fn(),
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

vi.mock("@/lib/fetcher", () => ({
  fetchJson: fetcherMock.fetchJson,
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
    fetcherMock.fetchJson.mockReset();
    fetcherMock.fetchJson.mockImplementation(async (url: string) => {
      if (url === "/api/settings") {
        return {
          userEmail: "owner@scenebook.test",
          creatorContext: "",
          providers: {
            gemini: { configured: false, source: "none", maskedValue: null },
            openrouter: { configured: false, source: "none", maskedValue: null },
            nim: { configured: false, source: "none", maskedValue: null },
            huggingface: { configured: false, source: "none", maskedValue: null },
          },
        };
      }

      if (url === "/api/instagram/accounts") {
        return [];
      }

      throw new Error(`Unhandled fetchJson call: ${url}`);
    });
  });

  test("settings page opens the integrations tab from the query string", async () => {
    render(await SettingsPage({
      searchParams: Promise.resolve({ tab: "integrations" }),
    }));

    expect(await screen.findByRole("tab", { name: "Integrations" })).toHaveAttribute("aria-selected", "true");

    for (const name of ["Google Drive", "Google Calendar", "YouTube", "Instagram", "Notion"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    expect(screen.getAllByText("not connected")).toHaveLength(5);
    expect(screen.getAllByText(/Set NANGO_SECRET_KEY/i)).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /connection unavailable/i }))
      .toHaveLength(5);
  });

  test("settings page shows Connect when Nango is configured", async () => {
    process.env.NANGO_SECRET_KEY = "server-secret";
    process.env.NANGO_INTEGRATION_GOOGLE_DRIVE = "scene-google-drive";

    render(await SettingsPage({
      searchParams: Promise.resolve({ tab: "integrations" }),
    }));

    expect(await screen.findByRole("button", { name: "Connect Google Drive" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Google Calendar connection unavailable" })).toBeDisabled();
  });

  test("settings page renders connection statuses from store rows", async () => {
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

    render(await SettingsPage({
      searchParams: Promise.resolve({ tab: "integrations" }),
    }));

    expect(await screen.findByText("connected")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("revoked")).toBeInTheDocument();
  });
});
