import { IntegrationCard } from "@/components/integrations/integration-card";
import { listIntegrationProviders } from "@/lib/integrations/connections/registry";

export default function SettingsIntegrationsPage() {
  const providers = listIntegrationProviders();

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
          {providers.map((provider) => (
            <IntegrationCard key={provider.provider} provider={provider} />
          ))}
        </section>
      </div>
    </main>
  );
}
