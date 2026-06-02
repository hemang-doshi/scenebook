import type { JsonValue } from "@/lib/types";

export type IntegrationProvider =
  | "google_drive"
  | "google_calendar"
  | "youtube"
  | "instagram"
  | "notion";

export type IntegrationConnectionStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "failed"
  | "revoked";

export type IntegrationProviderCategory =
  | "storage"
  | "calendar"
  | "publishing"
  | "analytics"
  | "workspace";

export type IntegrationRiskLevel = "read" | "write" | "publish";

export type IntegrationProviderDefinition = {
  provider: IntegrationProvider;
  displayName: string;
  category: IntegrationProviderCategory;
  status: "placeholder";
  requiresNango: boolean;
  riskLevel: IntegrationRiskLevel;
  description: string;
};

export type IntegrationConnection = {
  id: string;
  ownerId: string;
  projectId: string | null;
  provider: string;
  connectionId: string | null;
  status: IntegrationConnectionStatus;
  scopes: string[];
  metadata: Record<string, JsonValue>;
  createdAt: string;
  updatedAt: string;
};
