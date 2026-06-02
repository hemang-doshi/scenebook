import { IntegrationCard } from "@/components/integrations/integration-card";
import { requireServerUser } from "@/lib/auth/server-user";
import { listIntegrationProviders } from "@/lib/integrations/connections/registry";
import {
  listIntegrationConnections,
  type IntegrationConnectionStoreClient,
} from "@/lib/integrations/connections/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsIntegrationsPage() {
  const supabase = await createSupabaseServerClient();
  const user = await requireServerUser({ supabase: supabase as never });
  const providers = listIntegrationProviders();
  const connections = await listIntegrationConnections({
    supabase: supabase as unknown as IntegrationConnectionStoreClient,
    ownerId: user.id,
  });

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="border-b border-[var(--hairline)] pb-6">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-[var(--ink)]">
            Integrations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            External account connections are prepared here, but live connection management waits for the Nango bridge phase.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Integration providers">
          {providers.map((provider) => {
            const connection = connections.find((item) => item.provider === provider.provider);

            return (
              <IntegrationCard
                key={provider.provider}
                provider={provider}
                status={connection?.status ?? "not_connected"}
              />
            );
          })}
        </section>
      </div>
    </main>
  );
}
