import { getIntegrationProvider, listIntegrationProviders } from "@/lib/integrations/connections/registry";
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationProvider,
} from "@/lib/integrations/connections/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

type IntegrationConnectionRow = {
  id: string;
  owner_id: string;
  project_id: string | null;
  provider: string;
  connection_id: string | null;
  status: IntegrationConnection["status"];
  scopes: string[];
  metadata: Record<string, JsonValue>;
  created_at: string;
  updated_at: string;
};

type SupabaseIntegrationSelectChain<T> = {
  eq(column: string, value: string): SupabaseIntegrationSelectChain<T>;
  order(column: string, options: { ascending: boolean }): PromiseLike<{ data: T[] | null; error: Error | null }>;
};

type SupabaseIntegrationSingleChain<T> = {
  eq(column: string, value: string): SupabaseIntegrationSingleChain<T>;
  select(columns: string): {
    maybeSingle(): PromiseLike<{ data: T | null; error: Error | null }>;
  };
  maybeSingle(): PromiseLike<{ data: T | null; error: Error | null }>;
};

export type IntegrationConnectionStoreClient = {
  from(table: "integration_connections" | string): {
    select(columns: string): SupabaseIntegrationSelectChain<IntegrationConnectionRow>;
    upsert(payload: Record<string, unknown>, options?: { onConflict?: string }): {
      select(columns: string): {
        maybeSingle(): PromiseLike<{ data: IntegrationConnectionRow | null; error: Error | null }>;
      };
    };
    update(payload: Record<string, unknown>): SupabaseIntegrationSingleChain<IntegrationConnectionRow>;
    insert(payload: Record<string, unknown>): PromiseLike<{ data?: unknown; error: Error | null }>;
  };
};

type IntegrationEventStoreClient = {
  from(table: "integration_events" | string): {
    insert(payload: Record<string, unknown>): PromiseLike<{ data?: unknown; error: Error | null }>;
  };
};

const connectionColumns =
  "id, owner_id, project_id, provider, connection_id, status, scopes, metadata, created_at, updated_at";
const forbiddenMetadataKeys = new Set([
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "api_key",
  "apiKey",
  "client_secret",
  "clientSecret",
  "id_token",
  "idToken",
]);

function mapConnection(row: IntegrationConnectionRow): IntegrationConnection {
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    provider: row.provider,
    connectionId: row.connection_id,
    status: row.status,
    scopes: row.scopes ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertOwnerId(ownerId: string) {
  if (!ownerId.trim()) {
    throw new Error("ownerId is required for integration connection writes.");
  }
}

function assertRegisteredProvider(provider: IntegrationProvider) {
  if (!getIntegrationProvider(provider)) {
    throw new Error(`Unsupported integration provider: ${provider}.`);
  }
}

function jsonObject(value: unknown): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const object = JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;

  for (const key of forbiddenMetadataKeys) {
    delete object[key];
  }

  return object;
}

function nullable(value: string | undefined) {
  return value ?? null;
}

function assertRow(row: IntegrationConnectionRow | null, fallback: string) {
  if (!row) {
    throw new Error(fallback);
  }

  return mapConnection(row);
}

export function listPlaceholderIntegrationProviders() {
  return listIntegrationProviders();
}

export async function listIntegrationConnections(input: {
  ownerId: string;
  projectId?: string;
  provider?: IntegrationProvider;
  supabase?: IntegrationConnectionStoreClient;
}) {
  const supabase =
    input.supabase ??
    ((await createSupabaseServerClient()) as unknown as IntegrationConnectionStoreClient);
  let query = supabase
    .from("integration_connections")
    .select(connectionColumns)
    .eq("owner_id", input.ownerId);

  if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  if (input.provider) {
    query = query.eq("provider", input.provider);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapConnection);
}

export async function upsertIntegrationConnection(input: {
  ownerId: string;
  projectId?: string;
  provider: IntegrationProvider;
  connectionId?: string | null;
  status?: IntegrationConnectionStatus;
  scopes?: string[];
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationConnectionStoreClient;
}) {
  assertOwnerId(input.ownerId);
  assertRegisteredProvider(input.provider);

  const supabase =
    input.supabase ??
    ((await createSupabaseServerClient()) as unknown as IntegrationConnectionStoreClient);
  const { data, error } = await supabase
    .from("integration_connections")
    .upsert({
      owner_id: input.ownerId,
      project_id: nullable(input.projectId),
      provider: input.provider,
      connection_id: input.connectionId ?? null,
      status: input.status ?? "pending",
      scopes: input.scopes ?? [],
      metadata: jsonObject(input.metadata),
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,provider" })
    .select(connectionColumns)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return assertRow(data, "Unable to upsert integration connection.");
}

async function updateIntegrationConnection(input: {
  ownerId: string;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  projectId?: string;
  connectionId?: string | null;
  scopes?: string[];
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationConnectionStoreClient;
}) {
  assertOwnerId(input.ownerId);
  assertRegisteredProvider(input.provider);

  const supabase =
    input.supabase ??
    ((await createSupabaseServerClient()) as unknown as IntegrationConnectionStoreClient);
  let query = supabase
    .from("integration_connections")
    .update({
      status: input.status,
      connection_id: input.connectionId ?? null,
      ...(input.scopes ? { scopes: input.scopes } : {}),
      ...(input.metadata ? { metadata: jsonObject(input.metadata) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", input.ownerId)
    .eq("provider", input.provider);

  if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  const { data, error } = await query
    .select(connectionColumns)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return assertRow(data, "Integration connection not found.");
}

export function markIntegrationPending(input: {
  ownerId: string;
  projectId?: string;
  provider: IntegrationProvider;
  scopes?: string[];
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationConnectionStoreClient;
}) {
  return upsertIntegrationConnection({
    ...input,
    connectionId: null,
    status: "pending",
  });
}

export function markIntegrationConnected(input: {
  ownerId: string;
  projectId?: string;
  provider: IntegrationProvider;
  connectionId: string;
  scopes?: string[];
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationConnectionStoreClient;
}) {
  return upsertIntegrationConnection({
    ...input,
    status: "connected",
  });
}

export function markIntegrationFailed(input: {
  ownerId: string;
  projectId?: string;
  provider: IntegrationProvider;
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationConnectionStoreClient;
}) {
  return updateIntegrationConnection({
    ...input,
    status: "failed",
  });
}

export function revokeIntegrationConnection(input: {
  ownerId: string;
  projectId?: string;
  provider: IntegrationProvider;
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationConnectionStoreClient;
}) {
  return updateIntegrationConnection({
    ...input,
    connectionId: null,
    scopes: [],
    status: "revoked",
  });
}

export async function recordIntegrationEvent(input: {
  ownerId: string;
  projectId?: string;
  integrationConnectionId?: string;
  provider: IntegrationProvider;
  eventType: string;
  status: string;
  metadata?: Record<string, JsonValue>;
  supabase?: IntegrationEventStoreClient;
}) {
  assertOwnerId(input.ownerId);
  assertRegisteredProvider(input.provider);

  const supabase =
    input.supabase ??
    ((await createSupabaseServerClient()) as unknown as IntegrationEventStoreClient);
  const { error } = await supabase
    .from("integration_events")
    .insert({
      owner_id: input.ownerId,
      project_id: nullable(input.projectId),
      integration_connection_id: nullable(input.integrationConnectionId),
      provider: input.provider,
      event_type: input.eventType,
      status: input.status,
      metadata: jsonObject(input.metadata),
    });

  if (error) {
    throw error;
  }
}
