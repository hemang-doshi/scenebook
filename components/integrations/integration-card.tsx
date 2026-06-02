import { AtSign, CalendarDays, Cloud, FileText, PlaySquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import type { IntegrationProviderDefinition } from "@/lib/integrations/connections/types";

const icons = {
  google_drive: Cloud,
  google_calendar: CalendarDays,
  youtube: PlaySquare,
  instagram: AtSign,
  notion: FileText,
};

export function IntegrationCard({ provider }: { provider: IntegrationProviderDefinition }) {
  const Icon = icons[provider.provider];

  return (
    <article className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rounded-sm)] border border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--ink)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--ink)]">{provider.displayName}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{provider.description}</p>
          </div>
        </div>
        <IntegrationStatusBadge />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4">
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          Connection management will be enabled in the Nango bridge phase.
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled
          className="h-8 shrink-0 px-3 text-[10px]"
          aria-label={`${provider.displayName} connection unavailable until the Nango bridge phase`}
        >
          Connect
        </Button>
      </div>
    </article>
  );
}
