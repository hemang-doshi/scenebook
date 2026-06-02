import { listIntegrationProviders } from "@/lib/integrations/connections/registry";
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationProvider,
} from "@/lib/integrations/connections/types";
import { isNangoProviderConfigured } from "@/lib/integrations/nango/provider-map";

export type IntegrationSettingsCardModel = {
  provider: IntegrationProvider;
  displayName: string;
  description: string;
  status: IntegrationConnectionStatus;
  connectionId: string | null;
  metadata: Record<string, unknown>;
  nangoConfigured: boolean;
  providerConfigured: boolean;
  connectEnabled: boolean;
  setupMessage: string;
};

export function buildIntegrationSettingsCards(input: {
  connections: IntegrationConnection[];
  nangoConfigured: boolean;
}) {
  return listIntegrationProviders().map((provider) => {
    const connection = input.connections.find((item) => item.provider === provider.provider);
    const providerConfigured = isNangoProviderConfigured(provider.provider);
    const connectEnabled = input.nangoConfigured && providerConfigured;
    const setupMessage = !input.nangoConfigured
      ? "Set NANGO_SECRET_KEY to enable connection management."
      : !providerConfigured
        ? `Set ${provider.provider.toUpperCase()} provider mapping in Nango before connecting.`
        : "Credentials stay in Nango while SceneBook stores connection state and labels.";

    return {
      provider: provider.provider,
      displayName: provider.displayName,
      description: provider.description,
      status: connection?.status ?? "not_connected",
      connectionId: connection?.connectionId ?? null,
      metadata: connection?.metadata ?? {},
      nangoConfigured: input.nangoConfigured,
      providerConfigured,
      connectEnabled,
      setupMessage,
    } satisfies IntegrationSettingsCardModel;
  });
}
