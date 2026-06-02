import { listIntegrationProviders } from "@/lib/integrations/connections/registry";
import type { IntegrationConnection, IntegrationProvider } from "@/lib/integrations/connections/types";
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

export type IntegrationConnectionStoreClient = {
  from(table: "integration_connections" | string): {
    select(columns: string): SupabaseIntegrationSelectChain<IntegrationConnectionRow>;
  };
};

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
    .select("id, owner_id, project_id, provider, connection_id, status, scopes, metadata, created_at, updated_at")
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
