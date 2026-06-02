"use client";

import Nango from "@nangohq/frontend";
import type { ConnectUIEvent } from "@nangohq/frontend";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  IntegrationConnectionStatus,
  IntegrationProvider,
} from "@/lib/integrations/connections/types";

type ConnectResponse = {
  connectSession?: {
    token?: string;
    connectLink?: string | null;
  };
  nango?: {
    apiUrl?: string;
  };
};

const labels: Record<IntegrationConnectionStatus, string> = {
  not_connected: "Connect",
  pending: "Continue setup",
  connected: "Reconnect",
  failed: "Retry",
  revoked: "Reconnect",
};

export function IntegrationConnectButton({
  provider,
  displayName,
  status,
  enabled,
}: {
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationConnectionStatus;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openConnectLink(connectLink: string | null | undefined) {
    if (!connectLink) {
      throw new Error("Nango did not return a connect session.");
    }

    window.open(connectLink, "_self", "noopener,noreferrer");
  }

  async function markConnected(event: ConnectUIEvent) {
    if (event.type !== "connect") {
      return;
    }

    const response = await fetch(`/api/integrations/${provider}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectionId: event.payload.connectionId,
        providerConfigKey: event.payload.providerConfigKey,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to update connection status.");
    }

    router.refresh();
  }

  async function handleConnect() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Unable to start connection.");
      }

      const payload = (await response.json()) as ConnectResponse;
      const sessionToken = payload.connectSession?.token;
      const connectLink = payload.connectSession?.connectLink;

      if (!sessionToken) {
        openConnectLink(connectLink);
        return;
      }

      try {
        const nango = new Nango();
        const connectUI = nango.openConnectUI({
          sessionToken,
          apiURL: payload.nango?.apiUrl,
          onEvent: async (event) => {
            if (event.type === "connect") {
              await markConnected(event);
              connectUI.close();
            }

            if (event.type === "error") {
              setError(event.payload.errorMessage);
            }
          },
        });

        connectUI.open();
      } catch {
        openConnectLink(connectLink);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleHealthCheck() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/${provider}/health`);

      if (!response.ok) {
        throw new Error("Unable to check connection health.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check connection health.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Unable to disconnect integration.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to disconnect integration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!enabled || busy}
          className="h-8 px-3 text-[10px]"
          aria-label={enabled ? `${labels[status]} ${displayName}` : `${displayName} connection unavailable`}
          onClick={handleConnect}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : labels[status]}
        </Button>
        {enabled && status === "connected" ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-[10px]"
              aria-label={`Check ${displayName} health`}
              disabled={busy}
              onClick={handleHealthCheck}
            >
              Health
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-[10px]"
              aria-label={`Disconnect ${displayName}`}
              disabled={busy}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="max-w-36 text-right text-[10px] leading-snug text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
