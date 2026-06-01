import { z } from "zod";

export const planReelOutputSchema = z.object({
  angle: z.string(),
  audience: z.string(),
  emotionalPromise: z.string(),
  contentStructure: z.array(z.string()),
  visualStyle: z.string(),
  productionChecklist: z.array(z.string()),
  nextBestAction: z.string(),
  assumptions: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
});

export const scriptPackageOutputSchema = z.object({
  hookOptions: z.array(z.string()),
  selectedHook: z.string(),
  script: z.string(),
  voiceover: z.string(),
  onScreenText: z.string(),
  cta: z.string(),
  captionSeed: z.string(),
  structure: z.array(z.string()),
  pacingNotes: z.string(),
  estimatedDurationSeconds: z.number().int().positive(),
});

export const shootPackOutputSchema = z.object({
  scenes: z.array(z.string()),
  aRoll: z.array(z.string()),
  bRoll: z.array(z.string()),
  screenCaptures: z.array(z.string()),
  props: z.array(z.string()),
  missingAssets: z.array(z.string()),
  visualNotes: z.string(),
  locationNotes: z.string(),
  editingNotes: z.string(),
  feasibilityNotes: z.string(),
});

export const assetPromptPackOutputSchema = z.object({
  cinematicJsonPrompts: z.array(z.record(z.string(), z.unknown())),
  imagePrompts: z.array(z.string()),
  brollPrompts: z.array(z.string()),
  thumbnailPrompt: z.string(),
  voiceoverDirection: z.string(),
  musicDirection: z.string(),
  negativePrompts: z.array(z.string()),
  modelNotes: z.string(),
});

export const reviewOutputSchema = z.object({
  scorecard: z.object({
    clarity: z.number(),
    specificity: z.number(),
    momentum: z.number(),
    fitToGoal: z.number(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  specificImprovements: z.array(z.string()),
  improvedVersion: z.string(),
  keep: z.array(z.string()),
  cut: z.array(z.string()),
  riskNotes: z.array(z.string()),
});

export const publishPrepOutputSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  postingChecklist: z.array(z.string()),
  thumbnailText: z.string(),
  description: z.string(),
  firstComment: z.string(),
  readinessWarnings: z.array(z.string()),
  platformNotes: z.string(),
});

export const productionPackageOutputSchema = z.object({
  plan: planReelOutputSchema,
  scriptPackage: scriptPackageOutputSchema,
  shootPack: shootPackOutputSchema,
  assetPromptPack: assetPromptPackOutputSchema,
  publishPrep: publishPrepOutputSchema,
  packageSummary: z.string(),
  nextBestAction: z.string(),
});

export type PlanReelOutput = z.infer<typeof planReelOutputSchema>;
export type ScriptPackageOutput = z.infer<typeof scriptPackageOutputSchema>;
export type ShootPackOutput = z.infer<typeof shootPackOutputSchema>;
export type AssetPromptPackOutput = z.infer<typeof assetPromptPackOutputSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
export type PublishPrepOutput = z.infer<typeof publishPrepOutputSchema>;
export type ProductionPackageOutput = z.infer<typeof productionPackageOutputSchema>;
