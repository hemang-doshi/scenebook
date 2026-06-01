import type {
  AssetPromptPackOutput,
  PlanReelOutput,
  PublishPrepOutput,
  ReviewOutput,
  ScriptPackageOutput,
  ShootPackOutput,
} from "@/lib/agent/runtime-v4/workflows/workflow-schemas";
import type { CreativeWorkflowContext } from "@/lib/agent/runtime-v4/workflows/types";

type PlanInput = {
  prompt: string;
  platform?: string;
  format?: string;
  tone?: string;
};

export function fallbackPlanReel(input: PlanInput, context: CreativeWorkflowContext): PlanReelOutput {
  const brief = context.projectMind.creativeBrief;
  const platform = input.platform ?? brief?.platform ?? context.projectMind.project.platform ?? "instagram";
  const tone = input.tone ?? brief?.tone ?? "honest creator-led";
  const title = context.projectMind.project.title;

  return {
    angle: brief?.coreAngle || `Show the real problem behind ${title} and the practical decision that makes this video worth watching.`,
    audience: brief?.audience || "creators and builders who want a clearer short-form production workflow",
    emotionalPromise: brief?.viewerPromise || "Viewers should feel a concrete before-and-after shift, not a generic pitch.",
    contentStructure: [
      "Cold open with the specific messy workflow problem.",
      "Show the project, process, or product moment that changes the workflow.",
      "Name the before/after shift in one plain sentence.",
      "Close with the next action the viewer should take.",
    ],
    visualStyle: brief?.visualStyle || `Practical screen captures, candid process footage, and clean captions with a ${tone} tone for ${platform}.`,
    productionChecklist: [
      "Record one direct-to-camera setup.",
      "Capture two proof moments from the project or workflow.",
      "Collect one rough-process cutaway.",
      "Keep the edit tight enough for the target platform.",
      "End with one specific viewer action.",
    ],
    nextBestAction: "Generate a script package from this direction.",
    assumptions: [`The video should focus on ${title}.`, `The target format is ${input.format ?? context.projectMind.project.format ?? "short-form video"}.`],
    openQuestions: [],
  };
}

export function fallbackScriptPackage(input: { prompt: string; selectedAngle?: string; tone?: string; targetDurationSeconds?: number }, context: CreativeWorkflowContext): ScriptPackageOutput {
  const title = context.projectMind.project.title;
  const angle = input.selectedAngle ?? context.projectMind.creativeBrief?.coreAngle ?? `a practical creator workflow story about ${title}`;
  const tone = input.tone ?? context.projectMind.creativeBrief?.tone ?? "honest and specific";
  const selectedHook = `I kept running into the same content workflow problem, so I made ${title} solve one piece of it.`;

  return {
    hookOptions: [
      selectedHook,
      `The hardest part of this video was not editing. It was keeping the idea, script, and shoot notes connected.`,
      `Here is the workflow problem behind ${title}.`,
    ],
    selectedHook,
    script: [
      selectedHook,
      `The angle is simple: ${angle}.`,
      "Start with the messy before-state, show the workflow change, then prove it with one concrete screen or production moment.",
      "The goal is to make the process feel useful and real, not over-polished.",
      context.projectMind.creativeBrief?.cta ?? "Follow along for the next build or production step.",
    ].join("\n"),
    voiceover: `Use a ${tone} voiceover with short, grounded sentences.`,
    onScreenText: `${title}\nIdea -> script -> shoot pack -> ready to post`,
    cta: context.projectMind.creativeBrief?.cta ?? "Follow the build.",
    captionSeed: `${title}: turning a scattered content workflow into a production-ready package.`,
    structure: ["Hook", "Problem", "Workflow proof", "Payoff", "CTA"],
    pacingNotes: "Keep the hook under four seconds and make each beat visually distinct.",
    estimatedDurationSeconds: input.targetDurationSeconds ?? 35,
  };
}

export function fallbackShootPack(input: { prompt: string; script?: string; visualStyle?: string }, context: CreativeWorkflowContext): ShootPackOutput {
  const title = context.projectMind.project.title;
  const visualStyle = input.visualStyle ?? context.projectMind.creativeBrief?.visualStyle ?? "clean screen captures with candid process footage";

  return {
    scenes: [
      "On-camera hook naming the workflow problem.",
      `Screen or process capture showing ${title} in action.`,
      "Close-up proof of the script, checklist, or package being prepared.",
      "Final CTA with the next step.",
    ],
    aRoll: ["Record the hook in one clean take.", "Explain the workflow change in under ten seconds.", "Record the CTA plainly."],
    bRoll: ["Hands on keyboard while the project is open.", "Messy notes beside the finished production package.", "Quick scroll through the core workspace."],
    screenCaptures: ["Creative brief", "Script package", "Shoot pack checklist"],
    props: ["Laptop", "microphone", "rough notes"],
    missingAssets: ["Clean screen recording", "thumbnail-safe frame", "caption-safe product shot"],
    visualNotes: visualStyle,
    locationNotes: "Use a quiet practical workspace with enough light and minimal visual clutter.",
    editingNotes: "Cut on action between proof moments and keep captions inside safe margins.",
    feasibilityNotes: input.script || context.projectMind.scriptLab.script ? "Ready to shoot after screen captures are collected." : "Script is still thin; confirm the hook before shooting.",
  };
}

export function fallbackAssetPromptPack(input: { prompt: string; visualStyle?: string }, context: CreativeWorkflowContext): AssetPromptPackOutput {
  const title = context.projectMind.project.title;
  const visualStyle = input.visualStyle ?? context.projectMind.creativeBrief?.visualStyle ?? "realistic creator workspace";

  return {
    cinematicJsonPrompts: [
      { scene: "creator desk setup", subject: title, style: visualStyle, camera: "handheld medium close", mood: "focused and practical" },
      { scene: "workspace screen capture", subject: title, style: "readable product UI capture", camera: "screen recording", mood: "clear proof" },
    ],
    imagePrompts: [
      `Documentary still for ${title}, ${visualStyle}, natural light, realistic workspace.`,
      `Clean thumbnail frame showing ${title} and a readable production workflow moment.`,
    ],
    brollPrompts: ["Slow push-in on hands preparing the project.", "Cursor moving through the brief, script, and checklist."],
    thumbnailPrompt: `${title} workflow proof, readable product moment, concise thumbnail text.`,
    voiceoverDirection: "Conversational close-mic narration with no announcer tone.",
    musicDirection: "Low-key optimistic bed that leaves room for voiceover.",
    negativePrompts: ["stock photo", "glossy corporate ad", "fake UI text", "overly abstract gradients"],
    modelNotes: "Prompt pack only; no media generation or external API calls are performed.",
  };
}

export function fallbackReview(input: { target: string; content?: string; goal?: string }, content: string, context: CreativeWorkflowContext): ReviewOutput {
  const targetLabel = input.target.replace("_", " ");
  const title = context.projectMind.project.title;

  return {
    scorecard: {
      clarity: content ? 8 : 5,
      specificity: content.includes(title) ? 8 : 6,
      momentum: 7,
      fitToGoal: input.goal ? 8 : 7,
    },
    strengths: ["The piece has a concrete workflow problem to anchor it.", `The ${title} context gives the content a clear reason to exist.`],
    weaknesses: ["The hook can name the pain faster.", "The payoff should show one visible proof moment."],
    specificImprovements: ["Open with the before-state.", "Show proof within the first five seconds.", "Close with a specific next action."],
    improvedVersion: `Improved ${targetLabel}: ${title} turns a scattered production workflow into a clearer path from idea to package.`,
    keep: ["Concrete workflow problem", "Creator-led tone"],
    cut: ["Generic product claims", "Abstract benefits without proof"],
    riskNotes: ["Avoid implying external publishing or media generation is already connected."],
  };
}

export function fallbackPublishPrep(input: { prompt: string; platform?: "instagram" | "youtube_shorts" | "tiktok" }, context: CreativeWorkflowContext): PublishPrepOutput {
  const title = context.projectMind.project.title;
  const platform = input.platform ?? context.projectMind.creativeBrief?.platform ?? context.projectMind.project.platform ?? "instagram";
  const hasScript = Boolean(context.projectMind.scriptLab.script);
  const hasShootPack = context.projectMind.shootPack.aRoll.length + context.projectMind.shootPack.bRoll.length + context.projectMind.shootPack.screenCaptures.length > 0;

  return {
    caption: `${title}: turning the idea, script, and shoot prep into one production-ready workflow.`,
    hashtags: ["#buildinpublic", "#creatorworkflow", "#shortformvideo", `#${title.replace(/[^a-z0-9]/gi, "").toLowerCase()}`].filter(Boolean),
    postingChecklist: [
      "Confirm the first frame communicates the topic.",
      "Keep text inside platform-safe margins.",
      "Check voiceover and music levels.",
      `Preview natively on ${platform} before any manual publishing.`,
    ],
    thumbnailText: "Workflow, ready to shoot",
    description: `A short-form package for ${title}, prepared for manual review and posting.`,
    firstComment: "What part of your video workflow gets scattered first?",
    readinessWarnings: [
      ...(hasScript ? [] : ["Script is not complete yet."]),
      ...(hasShootPack ? [] : ["Shoot pack is not complete yet."]),
      "No external publishing was performed.",
    ],
    platformNotes: `Prepared for ${platform}; publish manually after review.`,
  };
}
