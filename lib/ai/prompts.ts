import type { ContentCard } from "@/lib/types";

type AssistMode =
  | "hooks"
  | "captions"
  | "rewrites"
  | "shot-list"
  | "follow-up"
  | "performance-summary";

function buildCardContext(card: Pick<
  ContentCard,
  | "title"
  | "platform"
  | "format"
  | "topicTags"
  | "scriptLab"
  | "analyticsJournal"
>) {
  return [
    `Title: ${card.title}`,
    `Platform: ${card.platform}`,
    `Format: ${card.format}`,
    `Topics: ${card.topicTags.join(", ") || "none"}`,
    `Hook: ${card.scriptLab.hook}`,
    `Angle: ${card.scriptLab.angle}`,
    `Outline: ${card.scriptLab.outline}`,
    `Script: ${card.scriptLab.script}`,
    `Caption: ${card.scriptLab.caption}`,
    `CTA: ${card.scriptLab.cta}`,
  ].join("\n");
}

export function buildAssistPrompt(
  mode: AssistMode,
  card: Pick<
    ContentCard,
    | "title"
    | "platform"
    | "format"
    | "topicTags"
    | "scriptLab"
    | "analyticsJournal"
  >,
) {
  const instructions = {
    hooks:
      "Generate 5 sharp hook options. Return suggestions only, one per line, and do not overwrite the creator's original text.",
    captions:
      "Generate 4 caption variants that keep the creator voice intact. Return suggestions only.",
    rewrites:
      "Rewrite the script in 3 alternate tones. Return suggestions only.",
    "shot-list":
      "Convert the current script into a practical short-form shot list. Return suggestions only.",
    "follow-up":
      "Suggest 4 follow-up content ideas that logically extend the same topic. Return suggestions only.",
    "performance-summary":
      "Summarize the manual performance data, explain what likely resonated, and suggest one follow-up idea. Return suggestions only.",
  } as const;

  const metrics = [
    `Views: ${card.analyticsJournal.views}`,
    `Likes: ${card.analyticsJournal.likes}`,
    `Comments: ${card.analyticsJournal.comments}`,
    `Shares: ${card.analyticsJournal.shares}`,
    `Saves: ${card.analyticsJournal.saves}`,
    `Watch note: ${card.analyticsJournal.watchTimeNote}`,
    `Reflection: ${card.analyticsJournal.reflection}`,
    `Decision: ${card.analyticsJournal.decision}`,
    `Existing follow-up idea: ${card.analyticsJournal.followUpIdea}`,
  ].join("\n");

  return `${instructions[mode]}\n\nCreator context:\n${buildCardContext(card)}\n\nPerformance context:\n${metrics}`;
}
