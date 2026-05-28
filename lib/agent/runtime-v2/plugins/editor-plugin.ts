import { z } from "zod";

import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";

const importAssetToEditorInputSchema = z.object({
  assetId: z.string().min(1),
  trackId: z.string().optional(),
  positionSeconds: z.number().min(0).optional(),
});

type ImportAssetToEditorInput = z.infer<typeof importAssetToEditorInputSchema>;

function notImplementedHandler(): never {
  throw new Error("Not implemented");
}

export const importAssetToEditorTool: AgentRuntimeTool<ImportAssetToEditorInput> = {
  name: "import_asset_to_editor",
  displayName: "Import Asset to Editor",
  description: "Stages an approved project asset in the editor timeline or media bin.",
  inputSchema: importAssetToEditorInputSchema,
  sideEffect: "editor_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Import Asset to Editor",
    subtitle: input.assetId,
    metadata: {
      trackId: input.trackId,
      positionSeconds: input.positionSeconds,
      sideEffect: "editor_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const editorPlugin: AgentPlugin = {
  name: "editor",
  description: "Editor import and composition operations.",
  capabilities: ["editor_import"],
  tools: [importAssetToEditorTool],
};
