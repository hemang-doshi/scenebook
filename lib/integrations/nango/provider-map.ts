import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { NangoProviderConfigurationError } from "@/lib/integrations/nango/errors";

export type NangoProviderMapping = {
  provider: IntegrationProvider;
  nangoIntegrationId: string;
  defaultScopes: string[];
};

const providerEnvNames: Record<IntegrationProvider, string> = {
  google_drive: "NANGO_INTEGRATION_GOOGLE_DRIVE",
  google_calendar: "NANGO_INTEGRATION_GOOGLE_CALENDAR",
  youtube: "NANGO_INTEGRATION_YOUTUBE",
  instagram: "NANGO_INTEGRATION_INSTAGRAM",
  notion: "NANGO_INTEGRATION_NOTION",
};

function envValue(name: string) {
  return process.env[name]?.trim() || null;
}

export function getNangoProviderMapping(provider: IntegrationProvider): NangoProviderMapping {
  const envName = providerEnvNames[provider];
  const nangoIntegrationId = envValue(envName);

  if (!nangoIntegrationId) {
    throw new NangoProviderConfigurationError(`${envName} is required before ${provider} can connect through Nango.`);
  }

  return {
    provider,
    nangoIntegrationId,
    defaultScopes: [],
  };
}

export function isNangoProviderConfigured(provider: IntegrationProvider) {
  return Boolean(envValue(providerEnvNames[provider]));
}
