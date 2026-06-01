import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import { generateWorkflowStructured } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import { fallbackPublishPrep } from "@/lib/agent/runtime-v4/workflows/workflow-fallbacks";
import { publishPrepOutputSchema, type PublishPrepOutput } from "@/lib/agent/runtime-v4/workflows/workflow-schemas";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  platform: z.enum(["instagram", "youtube_shorts", "tiktok"]).optional(),
});

type PublishPrepInput = z.infer<typeof inputSchema>;

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
          title: "Publish package",
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
  outputSchema: publishPrepOutputSchema,
  async handler(input, context) {
    const { output } = await generateWorkflowStructured({
      workflowName: "prepare_publish_package",
      schema: publishPrepOutputSchema,
      schemaName: "PublishPrepOutput",
      schemaDescription: "Manual publish prep with captions, hashtags, checklist, and readiness warnings.",
      system: "You are SceneBook's publish-prep producer. Never publish externally. Return structured output only.",
      prompt: [
        buildWorkflowContextBlock(context, input.prompt),
        `Target platform: ${input.platform ?? context.projectMind.creativeBrief?.platform ?? context.projectMind.project.platform ?? "unknown"}`,
        "Prepare a manual publish package. Include readiness warnings for missing script, shoot pack, caption, or assets.",
      ].join("\n\n"),
      context,
      fallback: () => fallbackPublishPrep(input, context),
    });

    return {
      status: "completed",
      workflowName: "prepare_publish_package",
      response: [`Caption: ${output.caption}`, `Hashtags: ${output.hashtags.join(" ")}`, "No external publishing was performed."].join("\n"),
      artifacts: [{
        type: "publish_package",
        title: "Publish package",
        summary: output.caption,
        payload: toJsonObject(output),
      }],
      patch: patchFor(output),
    };
  },
};
