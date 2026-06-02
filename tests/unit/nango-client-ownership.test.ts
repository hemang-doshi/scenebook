import { beforeEach, describe, expect, test, vi } from "vitest";

const nangoMock = vi.hoisted(() => ({
  getConnection: vi.fn(),
}));

vi.mock("@nangohq/node", () => ({
  Nango: vi.fn(function Nango() {
    return {
      getConnection: nangoMock.getConnection,
    };
  }),
}));

describe("Nango connection ownership verification", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NANGO_SECRET_KEY = "server-secret";
    nangoMock.getConnection.mockReset();
  });

  test("normalizes ownership tags from nested SDK response shapes", async () => {
    const { normalizeNangoConnectionOwnershipMetadata } = await import("@/lib/integrations/nango/client");

    expect(normalizeNangoConnectionOwnershipMetadata({
      data: {
        connection: {
          provider_config_key: "scene-google-drive",
          tags: {
            end_user_id: "user-1",
            scenebook_provider: "google_drive",
            scenebook_project_id: "project-1",
          },
        },
      },
    })).toEqual({
      endUserId: "user-1",
      provider: "google_drive",
      projectId: "project-1",
      nangoIntegrationId: "scene-google-drive",
    });
  });

  test("verifies matching user, provider, project, and integration tags", async () => {
    nangoMock.getConnection.mockResolvedValue({
      data: {
        tags: {
          end_user_id: "user-1",
          scenebook_provider: "google_drive",
          scenebook_project_id: "project-1",
        },
        providerConfigKey: "scene-google-drive",
      },
    });
    const { verifyNangoConnectionOwnership } = await import("@/lib/integrations/nango/client");

    await expect(verifyNangoConnectionOwnership({
      nangoIntegrationId: "scene-google-drive",
      connectionId: "nango-connection-1",
      userId: "user-1",
      provider: "google_drive",
      projectId: "project-1",
    })).resolves.toBe(true);
  });

  test("rejects mismatched ownership tags", async () => {
    nangoMock.getConnection.mockResolvedValue({
      data: {
        tags: {
          end_user_id: "other-user",
          scenebook_provider: "google_drive",
        },
        providerConfigKey: "scene-google-drive",
      },
    });
    const { verifyNangoConnectionOwnership } = await import("@/lib/integrations/nango/client");

    await expect(verifyNangoConnectionOwnership({
      nangoIntegrationId: "scene-google-drive",
      connectionId: "nango-connection-1",
      userId: "user-1",
      provider: "google_drive",
    })).resolves.toBe(false);
  });
});
