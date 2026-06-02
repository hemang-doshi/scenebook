import { Badge } from "@/components/ui/badge";
import type { IntegrationConnectionStatus } from "@/lib/integrations/connections/types";
import { cn } from "@/lib/utils";

const labels: Record<IntegrationConnectionStatus | "placeholder", string> = {
  not_connected: "coming soon",
  pending: "pending",
  connected: "connected",
  failed: "failed",
  revoked: "revoked",
  placeholder: "coming soon",
};

export function IntegrationStatusBadge({
  className,
  status = "not_connected",
}: {
  className?: string;
  status?: IntegrationConnectionStatus | "placeholder";
}) {
  return (
    <Badge
      className={cn(
        "border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--ink)]/70",
        className,
      )}
    >
      {labels[status]}
    </Badge>
  );
}
