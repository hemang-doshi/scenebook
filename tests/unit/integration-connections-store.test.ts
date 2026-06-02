import { describe, expect, test } from "vitest";

import { listIntegrationProviders } from "@/lib/integrations/connections/registry";
import { listIntegrationConnections, listPlaceholderIntegrationProviders } from "@/lib/integrations/connections/store";

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

  test("integration connection store never stores token fields", async () => {
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

    const connections = await listIntegrationConnections({ supabase, ownerId: "user-1" });

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
});
