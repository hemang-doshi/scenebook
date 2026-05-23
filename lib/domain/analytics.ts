import type { AnalyticsJournal, LearningDecision } from "@/lib/types";

type MetricInput = Pick<
  AnalyticsJournal,
  "views" | "likes" | "comments" | "shares" | "saves"
>;

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

export function summarizeMetrics(metrics: MetricInput) {
  const engagementCount =
    metrics.likes + metrics.comments + metrics.shares + metrics.saves;
  const engagementRate =
    metrics.views > 0 ? (engagementCount / metrics.views) * 100 : 0;
  const saveRate = metrics.views > 0 ? (metrics.saves / metrics.views) * 100 : 0;

  return {
    engagementRate: formatRate(engagementRate),
    saveRate: formatRate(saveRate),
    momentum:
      engagementRate >= 10 || saveRate >= 1.2
        ? "High"
        : engagementRate >= 5
          ? "Medium"
          : "Low",
  };
}

export function deriveNextFocus({
  reflection,
  decision,
  followUpIdea,
}: {
  reflection: string;
  decision: LearningDecision;
  followUpIdea: string;
}) {
  const label =
    decision === "repeat"
      ? "Repeat what already worked"
      : decision === "remix"
        ? "Remix the winner with one deliberate change"
        : "Retire the angle and capture the lesson";

  return `${label}. Reflection: ${reflection} Follow-up idea: ${followUpIdea}`;
}
