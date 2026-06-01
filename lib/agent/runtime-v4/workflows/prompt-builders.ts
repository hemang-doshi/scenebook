import type { CreativeWorkflowContext } from "@/lib/agent/runtime-v4/workflows/types";

function json(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

export function buildProjectBlock(context: CreativeWorkflowContext) {
  const project = context.compactProjectMind.project;
  return [
    `Project title: ${project.title}`,
    `Platform: ${project.platform ?? "unknown"}`,
    `Format: ${project.format ?? "unknown"}`,
    `Status: ${project.status}`,
    `Topic tags: ${project.topicTags.join(", ") || "none"}`,
    `Experiment tags: ${project.experimentTags.join(", ") || "none"}`,
  ].join("\n");
}

export function buildCreativeBriefBlock(context: CreativeWorkflowContext) {
  return `Creative brief:\n${json(context.compactProjectMind.creativeBrief)}`;
}

export function buildScriptStateBlock(context: CreativeWorkflowContext) {
  return `Script state:\n${json({
    compact: context.compactProjectMind.script,
    currentScriptLab: context.projectMind.scriptLab,
  })}`;
}

export function buildShootPackStateBlock(context: CreativeWorkflowContext) {
  return `Shoot pack state:\n${json({
    compact: context.compactProjectMind.shootPack,
    currentShootPack: context.projectMind.shootPack,
    assetLibrary: context.compactProjectMind.assetLibrary,
  })}`;
}

export function buildSelectedRejectedOutputsBlock(context: CreativeWorkflowContext) {
  return `Selected and rejected outputs:\n${json({
    selected: context.compactProjectMind.selectedOutputs,
    rejected: context.compactProjectMind.rejectedOutputs,
  })}`;
}

export function buildDurableMemoryBlock(context: CreativeWorkflowContext) {
  return `Durable memories and recent runs:\n${json({
    memories: context.compactProjectMind.durableMemories,
    recentRuns: context.compactProjectMind.recentRunSummaries,
  })}`;
}

export function buildReadinessBlock(context: CreativeWorkflowContext) {
  return `Readiness:\n${json({
    readiness: context.compactProjectMind.readiness,
    integrationState: context.compactProjectMind.integrationState,
    publish: context.projectMind.publish,
    editor: context.projectMind.editor,
  })}`;
}

export function buildUserPromptBlock(prompt: string) {
  return `User prompt:\n${prompt.trim()}`;
}

export function buildWorkflowContextBlock(context: CreativeWorkflowContext, userPrompt: string) {
  return [
    buildProjectBlock(context),
    buildCreativeBriefBlock(context),
    buildScriptStateBlock(context),
    buildShootPackStateBlock(context),
    buildSelectedRejectedOutputsBlock(context),
    buildDurableMemoryBlock(context),
    buildReadinessBlock(context),
    buildUserPromptBlock(userPrompt),
  ].join("\n\n");
}
