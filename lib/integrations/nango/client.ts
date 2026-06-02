import { Nango } from "@nangohq/node";

import type { ServerUser } from "@/lib/auth/server-user";
import type { IntegrationProvider } from "@/lib/integrations/connections/types";
import { getNangoConfig } from "@/lib/integrations/nango/config";
import { getNangoProviderMapping } from "@/lib/integrations/nango/provider-map";

export type SafeNangoConnectSession = {
  token: string;
  connectLink: string | null;
  expiresAt: string;
};

type NangoConnectionOwnershipMetadata = {
  endUserId: string | null;
  provider: string | null;
  projectId: string | null;
  nangoIntegrationId: string | null;
};

export function createNangoClient() {
  const config = getNangoConfig();

  return new Nango({
    secretKey: config.secretKey,
    host: config.host,
  });
}

function safeSession(data: Record<string, unknown>): SafeNangoConnectSession {
  return {
    token: String(data.token ?? ""),
    connectLink: typeof data.connect_link === "string" ? data.connect_link : null,
    expiresAt: String(data.expires_at ?? ""),
  };
}

export async function createNangoConnectSession(input: {
  provider: IntegrationProvider;
  user: ServerUser;
  projectId?: string;
}) {
  const nango = createNangoClient();
  const mapping = getNangoProviderMapping(input.provider);
  const session = await nango.createConnectSession({
    allowed_integrations: [mapping.nangoIntegrationId],
    tags: {
      end_user_id: input.user.id,
      end_user_email: input.user.email ?? "",
      scenebook_provider: input.provider,
      ...(input.projectId ? { scenebook_project_id: input.projectId } : {}),
    },
  });

  return {
    nangoIntegrationId: mapping.nangoIntegrationId,
    connectSession: safeSession(session.data as Record<string, unknown>),
  };
}

export function verifyNangoWebhookRequest(body: string, headers: Headers) {
  const nango = createNangoClient();
  const headerRecord = Object.fromEntries(headers.entries());

  return nango.verifyIncomingWebhookRequest(body, headerRecord);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function mergeOwnershipMetadata(
  metadata: NangoConnectionOwnershipMetadata,
  record: Record<string, unknown>,
) {
  metadata.endUserId ??= stringValue(record.end_user_id)
    ?? stringValue(record.endUserId)
    ?? stringValue(asRecord(record.endUser)?.id)
    ?? stringValue(asRecord(record.endUser)?.end_user_id)
    ?? stringValue(asRecord(record.endUser)?.endUserId)
    ?? stringValue(asRecord(record.end_user)?.id)
    ?? stringValue(asRecord(record.end_user)?.end_user_id)
    ?? stringValue(asRecord(record.end_user)?.endUserId);
  metadata.provider ??= stringValue(record.scenebook_provider);
  metadata.projectId ??= stringValue(record.scenebook_project_id) ?? stringValue(record.scenebookProjectId);
  metadata.nangoIntegrationId ??= stringValue(record.providerConfigKey)
    ?? stringValue(record.provider_config_key)
    ?? stringValue(record.integrationId)
    ?? stringValue(record.integration_id)
    ?? stringValue(record.nangoIntegrationId)
    ?? stringValue(record.nango_integration_id);
}

function visitOwnershipCandidate(
  value: unknown,
  metadata: NangoConnectionOwnershipMetadata,
  seen = new Set<unknown>(),
) {
  const record = asRecord(value);

  if (!record || seen.has(record)) {
    return;
  }

  seen.add(record);
  mergeOwnershipMetadata(metadata, record);

  for (const key of ["data", "connection", "tags", "metadata", "connection_config", "connectionConfig", "endUser", "end_user"]) {
    visitOwnershipCandidate(record[key], metadata, seen);
  }
}

export function normalizeNangoConnectionOwnershipMetadata(value: unknown): NangoConnectionOwnershipMetadata {
  const metadata: NangoConnectionOwnershipMetadata = {
    endUserId: null,
    provider: null,
    projectId: null,
    nangoIntegrationId: null,
  };

  visitOwnershipCandidate(value, metadata);

  return metadata;
}

export async function verifyNangoConnection(input: {
  nangoIntegrationId: string;
  connectionId: string;
}) {
  const nango = createNangoClient();

  try {
    await nango.getConnection(input.nangoIntegrationId, input.connectionId);
    return true;
  } catch {
    return false;
  }
}

export async function verifyNangoConnectionOwnership(input: {
  nangoIntegrationId: string;
  connectionId: string;
  userId: string;
  provider: IntegrationProvider;
  projectId?: string;
}) {
  const nango = createNangoClient();

  try {
    const connection = await nango.getConnection(input.nangoIntegrationId, input.connectionId);
    const metadata = normalizeNangoConnectionOwnershipMetadata(connection);
    const integrationMatches = !metadata.nangoIntegrationId
      || metadata.nangoIntegrationId === input.nangoIntegrationId;
    const projectMatches = !input.projectId || metadata.projectId === input.projectId;

    return integrationMatches
      && metadata.endUserId === input.userId
      && metadata.provider === input.provider
      && projectMatches;
  } catch {
    return false;
  }
}

export async function revokeNangoConnection(input: {
  nangoIntegrationId: string;
  connectionId: string;
}) {
  const nango = createNangoClient();

  await nango.deleteConnection(input.nangoIntegrationId, input.connectionId);
}
