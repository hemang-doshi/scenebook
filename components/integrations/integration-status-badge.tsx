import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function IntegrationStatusBadge({
  className,
  status = "placeholder",
}: {
  className?: string;
  status?: "placeholder";
}) {
  return (
    <Badge
      className={cn(
        "border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--ink)]/70",
        className,
      )}
    >
      {status === "placeholder" ? "coming soon" : status}
    </Badge>
  );
}
