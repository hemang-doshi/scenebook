import type {
  IntegrationProvider,
  IntegrationProviderDefinition,
} from "@/lib/integrations/connections/types";

export const integrationProviderRegistry: IntegrationProviderDefinition[] = [
  {
    provider: "google_drive",
    displayName: "Google Drive",
    category: "storage",
    status: "placeholder",
    requiresNango: true,
    riskLevel: "write",
    description: "File storage, asset import, and export workflows.",
  },
  {
    provider: "google_calendar",
    displayName: "Google Calendar",
    category: "calendar",
    status: "placeholder",
    requiresNango: true,
    riskLevel: "write",
    description: "Production scheduling and shoot reminders.",
  },
  {
    provider: "youtube",
    displayName: "YouTube",
    category: "publishing",
    status: "placeholder",
    requiresNango: true,
    riskLevel: "publish",
    description: "Upload planning, channel metadata, and publish workflows.",
  },
  {
    provider: "instagram",
    displayName: "Instagram",
    category: "publishing",
    status: "placeholder",
    requiresNango: true,
    riskLevel: "publish",
    description: "Reels publishing and account insights through the future bridge.",
  },
  {
    provider: "notion",
    displayName: "Notion",
    category: "workspace",
    status: "placeholder",
    requiresNango: true,
    riskLevel: "write",
    description: "Workspace handoff, notes, and campaign planning.",
  },
];

export function listIntegrationProviders() {
  return integrationProviderRegistry;
}

export function getIntegrationProvider(provider: IntegrationProvider) {
  return integrationProviderRegistry.find((definition) => definition.provider === provider) ?? null;
}
