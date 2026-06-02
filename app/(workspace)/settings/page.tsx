import { requireServerUser } from "@/lib/auth/server-user";
import { listIntegrationConnections, type IntegrationConnectionStoreClient } from "@/lib/integrations/connections/store";
import { isNangoConfigured } from "@/lib/integrations/nango/config";
import { buildIntegrationSettingsCards } from "@/lib/integrations/settings-view-model";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const user = await requireServerUser({ supabase: supabase as never });
  const params = await searchParams;
  const connections = await listIntegrationConnections({
    supabase: supabase as unknown as IntegrationConnectionStoreClient,
    ownerId: user.id,
  });
  const integrationCards = buildIntegrationSettingsCards({
    connections,
    nangoConfigured: isNangoConfigured(),
  });

  return (
    <SettingsPageClient
      initialTab={(firstValue(params.tab) ?? "ai-providers") as "ai-providers" | "creator-context" | "social" | "integrations" | "account"}
      integrationCards={integrationCards}
      oauthMessage={firstValue(params.message) ?? null}
      oauthReason={firstValue(params.reason) ?? null}
    />
  );
}
