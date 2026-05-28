import type { ProjectWorkspace } from "@/lib/data/repository";
import type { JsonValue, ScriptLab } from "@/lib/types";

export type ReviewTargetKind =
  | "script"
  | "hook"
  | "caption"
  | "content_idea"
  | "shot_list"
  | "asset_metadata"
  | "plan";

export type ProducerReview = {
  kind: "producer_review";
  targetKind: ReviewTargetKind;
  strongestPart: string;
  weakestPart: string;
  whyItMayOrMayNotWork: string;
  concreteImprovement: string;
  suggestedNextAction: string;
  sourceText: string;
};

export function inferReviewTargetKind(rawMessage: string, project: ProjectWorkspace | null): ReviewTargetKind {
  if (/\b(hook|opening|first line)\b/i.test(rawMessage)) return "hook";
  if (/\b(caption|post copy|description)\b/i.test(rawMessage)) return "caption";
  if (/\b(shot list|shots|b-roll|b roll|a-roll|a roll|shoot pack|storyboard)\b/i.test(rawMessage)) return "shot_list";
  if (/\b(asset|image|video|audio|generation|metadata|thumbnail)\b/i.test(rawMessage)) return "asset_metadata";
  if (/\b(idea|concept|angle)\b/i.test(rawMessage)) return "content_idea";
  if (/\b(plan|outline|checklist)\b/i.test(rawMessage)) return "plan";
  if (project?.scriptLab.script || project?.scriptLab.hook || project?.scriptLab.caption) return "script";
  return "content_idea";
}

export function getReviewSource(input: {
  rawMessage: string;
  project: ProjectWorkspace | null;
  targetKind?: ReviewTargetKind;
}) {
  const targetKind = input.targetKind ?? inferReviewTargetKind(input.rawMessage, input.project);
  const directText = input.rawMessage
    .replace(/\b(is this good|critique this|review this|give me feedback|make it better|improve this|rewrite this)\??/gi, "")
    .trim();

  if (directText.length > 20 && !/^(it|this)$/i.test(directText)) {
    return directText;
  }

  const project = input.project;
  if (!project) return input.rawMessage.trim();

  if (targetKind === "hook" && project.scriptLab.hook.trim()) return project.scriptLab.hook.trim();
  if (targetKind === "caption" && project.scriptLab.caption.trim()) return project.scriptLab.caption.trim();
  if (targetKind === "shot_list") {
    const shotList = [
      ...project.shootPack.aRoll.map((item) => item.label),
      ...project.shootPack.bRoll.map((item) => item.label),
      ...project.shootPack.screenCaptures.map((item) => item.label),
      project.shootPack.visualNotes,
      project.shootPack.locationNotes,
    ].filter(Boolean).join("\n");
    if (shotList.trim()) return shotList.trim();
  }
  if (targetKind === "asset_metadata" && project.assets.length > 0) {
    return project.assets
      .map((asset) => [asset.title, asset.type, asset.url].filter(Boolean).join(" - "))
      .join("\n");
  }

  return scriptLabSource(project.scriptLab) || project.title || input.rawMessage.trim();
}

export function buildProducerReview(input: {
  rawMessage: string;
  project: ProjectWorkspace | null;
  sourceText?: string;
  targetKind?: ReviewTargetKind;
}): ProducerReview {
  const targetKind = input.targetKind ?? inferReviewTargetKind(input.rawMessage, input.project);
  const sourceText = input.sourceText ?? getReviewSource({ rawMessage: input.rawMessage, project: input.project, targetKind });
  const compactSource = sourceText.replace(/\s+/g, " ").trim();
  const firstSentence = compactSource.split(/[.!?]\s+/)[0]?.trim() || compactSource;
  const hasConcreteVisual = /\b(show|reveal|frame|shot|before|after|close-up|close up|light|camera|scene|visual)\b/i.test(compactSource);
  const hasAudiencePromise = /\b(save|learn|fix|avoid|make|turn|why|how)\b/i.test(compactSource);
  const hasSpecificCta = /\b(save|comment|follow|share|try|download|book|visit)\b/i.test(compactSource);

  return {
    kind: "producer_review",
    targetKind,
    strongestPart: firstSentence
      ? `The clearest producer signal is: ${firstSentence.slice(0, 160)}.`
      : "There is enough raw direction to shape a stronger creative pass.",
    weakestPart: hasConcreteVisual
      ? "The idea has visuals, but the payoff needs sharper sequencing so the audience knows what changed."
      : "The piece is still too abstract; it needs a visible proof point or scene-level payoff.",
    whyItMayOrMayNotWork: hasAudiencePromise
      ? "It may work because the viewer benefit is present, but it will underperform if the opening does not prove that benefit fast."
      : "It may not work yet because the audience promise is implied rather than stated in a scroll-stopping way.",
    concreteImprovement: hasSpecificCta
      ? "Move the most specific visual result into the first beat, then keep the CTA short."
      : "Add one explicit viewer payoff and a direct CTA that matches it.",
    suggestedNextAction: shouldSaveImprovement(input.rawMessage)
      ? "Generate the improved version, save it to Script Lab, and capture it as a versioned artifact."
      : "Choose whether you want critique only or a rewritten version before changing the workspace.",
    sourceText,
  };
}

export function formatProducerReview(review: ProducerReview) {
  return [
    `Strongest part: ${review.strongestPart}`,
    `Weakest part: ${review.weakestPart}`,
    `Why it may or may not work: ${review.whyItMayOrMayNotWork}`,
    `One concrete improvement: ${review.concreteImprovement}`,
    `Suggested next action: ${review.suggestedNextAction}`,
  ].join("\n");
}

export function shouldRewriteFromReview(rawMessage: string) {
  return /\b(make it better|make this better|make it more|improve this|rewrite this|rewrite it|improve it|stronger|punchier|cinematic)\b/i.test(rawMessage);
}

export function shouldSaveImprovement(rawMessage: string) {
  return shouldRewriteFromReview(rawMessage) && /\b(save|update|apply|persist|store)\b/i.test(rawMessage);
}

export function scriptLabReviewPayload(scriptLab: ScriptLab): Record<string, JsonValue> {
  return {
    hook: scriptLab.hook,
    outline: scriptLab.outline,
    script: scriptLab.script,
    caption: scriptLab.caption,
    cta: scriptLab.cta,
    onScreenText: scriptLab.onScreenText,
    notes: scriptLab.notes,
  };
}

function scriptLabSource(scriptLab: ScriptLab) {
  return [
    scriptLab.hook ? `Hook: ${scriptLab.hook}` : null,
    scriptLab.outline ? `Outline: ${scriptLab.outline}` : null,
    scriptLab.script ? `Script: ${scriptLab.script}` : null,
    scriptLab.caption ? `Caption: ${scriptLab.caption}` : null,
    scriptLab.cta ? `CTA: ${scriptLab.cta}` : null,
  ].filter(Boolean).join("\n");
}
