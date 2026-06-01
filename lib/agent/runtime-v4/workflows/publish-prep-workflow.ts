import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  platform: z.enum(["instagram", "youtube_shorts", "tiktok"]).optional(),
});

const outputSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  postingChecklist: z.array(z.string()),
  thumbnailText: z.string(),
  description: z.string(),
  firstComment: z.string(),
  readinessWarnings: z.array(z.string()),
});

type PublishPrepInput = z.infer<typeof inputSchema>;
type PublishPrepOutput = z.infer<typeof outputSchema>;

function outputFor(input: PublishPrepInput, hasScript: boolean): PublishPrepOutput {
  const platform = input.platform ?? "instagram";
  return {
    caption: "Building SceneBook in public: the short-form video workflow tool I kept needing. This one goes from idea to script to shoot pack without losing the thread.",
    hashtags: ["#buildinpublic", "#founderdevlog", "#shortformvideo", "#creatorworkflow", "#scenebook"],
    postingChecklist: [
      "Confirm the first frame clearly shows SceneBook or the founder.",
      "Keep burned-in text inside caption-safe margins.",
      "Check audio levels against the music bed.",
      `Preview the post natively on ${platform} before publishing later.`,
    ],
    thumbnailText: "Building the video workflow I needed",
    description: "A founder-devlog reel about why SceneBook exists and how it supports short-form production.",
    firstComment: "What part of your video workflow gets scattered first: ideas, scripts, assets, or feedback?",
    readinessWarnings: hasScript ? ["No external publishing is wired in Phase 8."] : ["Script is not complete yet.", "No external publishing is wired in Phase 8."],
  };
}

function patchFor(output: PublishPrepOutput): ProjectPatch {
  return {
    title: "Save publish prep package",
    summary: "Save caption, hashtags, thumbnail text, and posting checklist without publishing externally.",
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "create_project_artifact",
        input: {
          artifactType: "publish_package",
          title: "SceneBook launch reel publish package",
          payload: toJsonObject(output),
          metadata: { workflowName: "prepare_publish_package", externalPublish: false },
        },
      },
      {
        type: "update_script_lab",
        input: {
          caption: output.caption,
          notes: `Publish prep saved. Thumbnail text: ${output.thumbnailText}`,
        },
      },
    ],
    metadata: { workflowName: "prepare_publish_package", externalPublish: false },
  };
}

export const publishPrepWorkflow: CreativeWorkflow<PublishPrepInput, PublishPrepOutput> = {
  name: "prepare_publish_package",
  displayName: "Prepare Publish Package",
  description: "Prepares captions, hashtags, thumbnail text, and a posting checklist without publishing.",
  inputSchema,
  outputSchema,
  handler(input, context) {
    const output = outputFor(input, Boolean(context.projectMind.scriptLab.script));

    return {
      status: "completed",
      workflowName: "prepare_publish_package",
      response: [`Caption: ${output.caption}`, `Hashtags: ${output.hashtags.join(" ")}`, "No external publishing was performed."].join("\n"),
      artifacts: [{
        type: "publish_package",
        title: "SceneBook launch reel publish package",
        summary: output.caption,
        payload: toJsonObject(output),
      }],
      patch: patchFor(output),
    };
  },
};
