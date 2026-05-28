import { z } from "zod";

import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";
import type { JsonValue } from "@/lib/types";

const prepareInstagramPostInputSchema = z.object({
  caption: z.string().min(1),
  mediaAssetId: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  firstComment: z.string().optional(),
});

const publishToInstagramInputSchema = z.object({
  caption: z.string().min(1),
  mediaAssetId: z.string().min(1),
  instagramAccountId: z.string().min(1),
  scheduledAt: z.string().optional(),
});

type PrepareInstagramPostInput = z.infer<typeof prepareInstagramPostInputSchema>;
type PublishToInstagramInput = z.infer<typeof publishToInstagramInputSchema>;

type PrepareInstagramPostOutput = Record<string, JsonValue> & {
  kind: "instagram_post_package";
  caption: string;
  hashtags: string[];
  firstComment: string;
  mediaAssetId: string | null;
};

function notImplementedHandler(): never {
  throw new Error("Not implemented");
}

export const prepareInstagramPostTool: AgentRuntimeTool<PrepareInstagramPostInput, PrepareInstagramPostOutput> = {
  name: "prepare_instagram_post",
  displayName: "Prepare Instagram Post",
  description: "Builds Instagram-ready caption, hashtag, media, and first-comment metadata.",
  inputSchema: prepareInstagramPostInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  handler: (_ctx, input) => {
    const hashtags = input.hashtags?.length
      ? input.hashtags
      : inferHashtags(input.caption);

    return {
      message: "Instagram post package prepared.",
      output: {
        kind: "instagram_post_package",
        caption: input.caption,
        hashtags,
        firstComment: input.firstComment ?? hashtags.join(" "),
        mediaAssetId: input.mediaAssetId ?? null,
      },
    };
  },
  displayFormatter: (input) => ({
    title: "Prepare Instagram Post",
    subtitle: input.caption.slice(0, 120),
    metadata: {
      mediaAssetId: input.mediaAssetId,
      hashtagCount: input.hashtags?.length,
      sideEffect: "none",
      approvalPolicy: "auto",
    },
  }),
};

function inferHashtags(caption: string) {
  const existing = caption.match(/#[\w-]+/g);
  if (existing?.length) {
    return existing.slice(0, 12);
  }

  return ["#reels", "#creatorworkflow", "#behindthescenes"];
}

export const publishToInstagramTool: AgentRuntimeTool<PublishToInstagramInput> = {
  name: "publish_to_instagram",
  displayName: "Publish to Instagram",
  description: "Publishes an approved media asset and caption to the connected Instagram account.",
  inputSchema: publishToInstagramInputSchema,
  sideEffect: "publish",
  approvalPolicy: "always",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Publish to Instagram",
    subtitle: input.caption.slice(0, 120),
    metadata: {
      mediaAssetId: input.mediaAssetId,
      instagramAccountId: input.instagramAccountId,
      scheduledAt: input.scheduledAt,
      sideEffect: "publish",
      approvalPolicy: "always",
    },
  }),
};

export const instagramPlugin: AgentPlugin = {
  name: "instagram",
  description: "Instagram post preparation and publishing operations.",
  capabilities: ["instagram_posts", "publishing"],
  tools: [prepareInstagramPostTool, publishToInstagramTool],
};
