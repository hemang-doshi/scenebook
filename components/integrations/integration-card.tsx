import { AtSign, CalendarDays, Cloud, FileText, PlaySquare } from "lucide-react";

import { IntegrationConnectButton } from "@/components/integrations/integration-connect-button";
import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import type {
  IntegrationConnectionStatus,
  IntegrationProviderDefinition,
} from "@/lib/integrations/connections/types";

const icons = {
  google_drive: Cloud,
  google_calendar: CalendarDays,
  youtube: PlaySquare,
  instagram: AtSign,
  notion: FileText,
};

export function IntegrationCard({
  provider,
  status = "not_connected",
  connectEnabled = false,
}: {
  provider: IntegrationProviderDefinition;
  status?: IntegrationConnectionStatus;
  connectEnabled?: boolean;
}) {
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
        <IntegrationStatusBadge status={status} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4">
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          {connectEnabled
            ? "Credentials stay in Nango while SceneBook tracks connection status."
            : "Configure Nango environment values to enable connection management."}
        </p>
        <IntegrationConnectButton
          provider={provider.provider}
          displayName={provider.displayName}
          status={status}
          enabled={connectEnabled}
        />
      </div>
    </article>
  );
}
