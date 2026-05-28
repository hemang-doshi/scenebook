import { z } from "zod";

import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";

const scriptPackageInputSchema = z.object({
  prompt: z.string().min(1),
  brief: z.record(z.string(), z.unknown()).optional(),
});

const critiqueScriptInputSchema = z.object({
  script: z.string().min(1),
  criteria: z.array(z.string()).optional(),
});

const updateScriptLabInputSchema = z.object({
  hook: z.string().optional(),
  outline: z.string().optional(),
  script: z.string().optional(),
  caption: z.string().optional(),
  onScreenText: z.string().optional(),
  cta: z.string().optional(),
  notes: z.string().optional(),
  overwrite: z.boolean().optional(),
});

type ScriptPackageInput = z.infer<typeof scriptPackageInputSchema>;
type CritiqueScriptInput = z.infer<typeof critiqueScriptInputSchema>;
type UpdateScriptLabInput = z.infer<typeof updateScriptLabInputSchema>;

function notImplementedHandler(): never {
  throw new Error("Not implemented");
}

export const generateScriptPackageTool: AgentRuntimeTool<ScriptPackageInput> = {
  name: "generate_script_package",
  displayName: "Generate Script Package",
  description: "Drafts a structured hook, outline, script, caption, CTA, and on-screen text package.",
  inputSchema: scriptPackageInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Generate Script Package",
    subtitle: input.prompt,
    metadata: {
      sideEffect: "none",
      approvalPolicy: "auto",
    },
  }),
};

export const critiqueScriptTool: AgentRuntimeTool<CritiqueScriptInput> = {
  name: "critique_script",
  displayName: "Critique Script",
  description: "Reviews script clarity, retention, hook strength, structure, and platform fit.",
  inputSchema: critiqueScriptInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Critique Script",
    subtitle: input.script.slice(0, 120),
    metadata: {
      criteria: input.criteria?.join(", "),
      sideEffect: "none",
      approvalPolicy: "auto",
    },
  }),
};

export const updateScriptLabTool: AgentRuntimeTool<UpdateScriptLabInput> = {
  name: "update_script_lab",
  displayName: "Update Script Lab",
  description: "Applies approved script package fields to the project's Script Lab.",
  inputSchema: updateScriptLabInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
  displayFormatter: () => ({
    title: "Update Script Lab",
    subtitle: "Apply script fields to the project workspace.",
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const scriptPlugin: AgentPlugin = {
  name: "script",
  description: "Script generation, critique, and Script Lab updates.",
  capabilities: ["script_generation", "script_critique", "script_lab_updates"],
  tools: [generateScriptPackageTool, critiqueScriptTool, updateScriptLabTool],
};
