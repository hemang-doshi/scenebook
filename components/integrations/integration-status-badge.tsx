import { Badge } from "@/components/ui/badge";
import type { IntegrationConnectionStatus } from "@/lib/integrations/connections/types";
import { cn } from "@/lib/utils";

const labels: Record<IntegrationConnectionStatus | "placeholder", string> = {
  not_connected: "not connected",
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
        status === "connected"
          ? "border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--lime)]"
          : status === "failed" || status === "revoked"
            ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]"
            : status === "pending"
              ? "border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)]"
              : "border-[var(--line)] bg-[rgba(255,255,255,.055)] text-[var(--muted)]",
        className,
      )}
    >
      {labels[status]}
    </Badge>
  );
}
