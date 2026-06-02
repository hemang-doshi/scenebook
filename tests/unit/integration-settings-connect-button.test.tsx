import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { IntegrationConnectButton } from "@/components/integrations/integration-connect-button";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const nangoMock = vi.hoisted(() => ({
  openConnectUI: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@nangohq/frontend", () => ({
  default: vi.fn().mockImplementation(function MockNango() {
    return {
    openConnectUI: nangoMock.openConnectUI,
    };
  }),
}));

describe("IntegrationConnectButton", () => {
  beforeEach(() => {
    routerMock.refresh.mockReset();
    nangoMock.openConnectUI.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  test("settings page shows Connect when Nango configured", () => {
    render(
      <IntegrationConnectButton
        provider="google_drive"
        displayName="Google Drive"
        status="not_connected"
        enabled
      />,
    );

    expect(screen.getByRole("button", { name: "Connect Google Drive" })).toBeEnabled();
  });

  test("settings page stays disabled when Nango not configured", () => {
    render(
      <IntegrationConnectButton
        provider="google_drive"
        displayName="Google Drive"
        status="not_connected"
        enabled={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Google Drive connection unavailable" })).toBeDisabled();
  });

  test("connect button launches Nango and records status after successful connection", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        connectSession: { token: "session-token" },
        nango: { apiUrl: "https://api.nango.dev" },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "connected",
        connectionId: "nango-connection-1",
      }), { status: 200 }));
    nangoMock.openConnectUI.mockImplementation(({ onEvent }) => ({
      open: () => onEvent({
        type: "connect",
        payload: {
          connectionId: "nango-connection-1",
          providerConfigKey: "scene-google-drive",
        },
      }),
      close: vi.fn(),
    }));

    render(
      <IntegrationConnectButton
        provider="google_drive"
        displayName="Google Drive"
        status="not_connected"
        enabled
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect Google Drive" }));

    await waitFor(() => {
      expect(routerMock.refresh).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/integrations/google_drive/connect", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/integrations/google_drive/status", expect.objectContaining({
      method: "POST",
    }));
  });
});
