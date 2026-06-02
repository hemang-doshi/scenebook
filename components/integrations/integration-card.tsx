import { AtSign, CalendarDays, Cloud, FileText, PlaySquare } from "lucide-react";

import { IntegrationConnectButton } from "@/components/integrations/integration-connect-button";
import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import type { IntegrationSettingsCardModel } from "@/lib/integrations/settings-view-model";

const icons = {
  google_drive: Cloud,
  google_calendar: CalendarDays,
  youtube: PlaySquare,
  instagram: AtSign,
  notion: FileText,
};

export function IntegrationCard({
  provider,
}: {
  provider: IntegrationSettingsCardModel;
}) {
  const Icon = icons[provider.provider];

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(255,255,255,.045)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(105,167,255,.12)] text-[var(--blue-2)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--ink)]">{provider.displayName}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{provider.description}</p>
          </div>
        </div>
        <IntegrationStatusBadge status={provider.status} />
      </div>

      <div className="mt-5 flex items-start justify-between gap-3 border-t border-[var(--line)] pt-4">
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          {provider.setupMessage}
        </p>
        <IntegrationConnectButton
          provider={provider.provider}
          displayName={provider.displayName}
          status={provider.status}
          enabled={provider.connectEnabled}
        />
      </div>
    </article>
  );
}
