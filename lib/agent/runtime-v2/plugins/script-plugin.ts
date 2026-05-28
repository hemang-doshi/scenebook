import { z } from "zod";

import {
  generateStructuredCommandUpdate,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";
import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";
import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import type { JsonValue, ScriptLab } from "@/lib/types";

const scriptPackageInputSchema = z.object({
  prompt: z.string().min(1),
  brief: z.record(z.string(), z.unknown()).optional(),
});

const critiqueScriptInputSchema = z.object({
  script: z.string().min(1),
  hook: z.string().optional(),
  caption: z.string().optional(),
  cta: z.string().optional(),
  criteria: z.array(z.string()).optional(),
});

const updateScriptLabInputSchema = z.object({
  angle: z.string().optional(),
  hook: z.string().optional(),
  outline: z.union([z.string(), z.array(z.string())]).optional(),
  script: z.string().optional(),
  caption: z.string().optional(),
  onScreenText: z.union([z.string(), z.array(z.string())]).optional(),
  cta: z.string().optional(),
  notes: z.string().optional(),
  overwrite: z.boolean().optional(),
});

type ScriptPackageInput = z.infer<typeof scriptPackageInputSchema>;
type CritiqueScriptInput = z.infer<typeof critiqueScriptInputSchema>;
type UpdateScriptLabInput = z.infer<typeof updateScriptLabInputSchema>;

type ScriptPackageOutput = Record<string, JsonValue> & {
  kind: "script_package";
  hook: string;
  outline: string[];
  script: string;
  caption: string;
  cta: string;
  onScreenText: string[];
  scriptLabPatch: Record<string, JsonValue>;
};

type ScriptCritiqueOutput = Record<string, JsonValue> & {
  kind: "script_critique";
  strongestPart: string;
  weakestPart: string;
  suggestedImprovement: string;
};

type ScriptLabUpdateOutput = Record<string, JsonValue> & {
  kind: "script_lab_update";
  projectId: string;
  updatedFields: string[];
  scriptLab: Record<string, JsonValue>;
};

export const generateScriptPackageTool: AgentRuntimeTool<ScriptPackageInput, ScriptPackageOutput> = {
  name: "generate_script_package",
  displayName: "Generate Script Package",
  description: "Drafts a structured hook, outline, script, caption, CTA, and on-screen text package.",
  inputSchema: scriptPackageInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx: {
        projectId: ctx.projectId,
        threadId: ctx.threadId ?? "",
        runId: ctx.runId ?? "",
        rawInput: ctx.rawInput ?? input.prompt,
        project: ctx.project,
        selectedModel: ctx.selectedModel,
        selectedModels: ctx.selectedModels,
        emitProgress: ctx.emitProgress,
      },
      command: "script",
      prompt: [
        "Return only JSON.",
        `Schema:
{
  "hook": "string",
  "outline": ["string"],
  "script": "string",
  "caption": "string",
  "cta": "string",
  "onScreenText": ["string"]
}`,
        input.brief ? `Creative brief:\n${JSON.stringify(input.brief)}` : null,
        `User brief:\n${input.prompt}`,
      ].filter(Boolean).join("\n\n"),
      normalize: normalizeScriptOutput,
    });
    validateScriptPackage(parsed);

    const output = withStructuredRepairMetadata({
      kind: "script_package" as const,
      hook: parsed.hook,
      outline: parsed.outline,
      script: parsed.script,
      caption: parsed.caption,
      cta: parsed.cta,
      onScreenText: parsed.onScreenText,
      scriptLabPatch: toScriptLabPatch(parsed),
      metadata: {
        model: ctx.selectedModels?.chat ?? ctx.selectedModel ?? null,
      },
    }, repaired) as ScriptPackageOutput;

    return {
      message: "Script package generated.",
      output,
    };
  },
  displayFormatter: (input) => ({
    title: "Generate Script Package",
    subtitle: input.prompt,
    metadata: {
      sideEffect: "none",
      approvalPolicy: "auto",
    },
  }),
};

export const critiqueScriptTool: AgentRuntimeTool<CritiqueScriptInput, ScriptCritiqueOutput> = {
  name: "critique_script",
  displayName: "Critique Script",
  description: "Reviews script clarity, retention, hook strength, structure, and platform fit.",
  inputSchema: critiqueScriptInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  handler: (_ctx, input) => {
    const hook = input.hook?.trim();
    const script = input.script.trim();
    const cta = input.cta?.trim();
    const hasClearCta = Boolean(cta) || /\b(save|follow|comment|share|try|visit|book|download)\b/i.test(script);
    const sentenceCount = script.split(/[.!?]+/).filter((part) => part.trim()).length;

    const output: ScriptCritiqueOutput = {
      kind: "script_critique",
      strongestPart: hook
        ? `The hook gives the piece a clear opening promise: "${hook.slice(0, 120)}".`
        : "The script has a usable core idea and enough direction to stage the first draft.",
      weakestPart: sentenceCount > 8
        ? "The middle may carry too many beats for a short-form script."
        : "The payoff could be made more concrete so the viewer knows why to keep watching.",
      suggestedImprovement: hasClearCta
        ? "Make the visual payoff arrive earlier, then keep the CTA short."
        : "Add a direct CTA that matches the viewer benefit.",
    };

    return {
      message: "Producer critique ready.",
      output,
    };
  },
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

export const updateScriptLabTool: AgentRuntimeTool<UpdateScriptLabInput, ScriptLabUpdateOutput> = {
  name: "update_script_lab",
  displayName: "Update Script Lab",
  description: "Applies approved script package fields to the project's Script Lab.",
  inputSchema: updateScriptLabInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  async handler(ctx, input) {
    if (!ctx.project) {
      throw new Error("Project not found for Script Lab update.");
    }

    const patch = normalizeScriptLabPatch(input);
    const updatedFields = Object.keys(patch);
    if (updatedFields.length === 0) {
      return {
        message: "No Script Lab fields changed.",
        output: {
          kind: "script_lab_update",
          projectId: ctx.projectId,
          updatedFields: [],
          scriptLab: scriptLabToJson(ctx.project.scriptLab),
        },
      };
    }

    const currentProject = await getProjectWorkspace(ctx.projectId);
    const currentScriptLab = currentProject?.scriptLab ?? ctx.project.scriptLab;
    const nextScriptLab: ScriptLab = {
      ...currentScriptLab,
      ...patch,
    };

    const updatedProject = await updateCard(ctx.projectId, {
      scriptLab: nextScriptLab,
    });

    return {
      message: "Script Lab updated.",
      output: {
        kind: "script_lab_update",
        projectId: ctx.projectId,
        updatedFields,
        scriptLab: scriptLabToJson(updatedProject.scriptLab),
      },
    };
  },
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

function normalizeScriptOutput(input: Record<string, unknown>) {
  const source = isRecord(input.scriptLab) ? input.scriptLab : input;

  return {
    hook: getString(source.hook),
    outline: normalizeStringList(source.outline),
    script: getString(source.script),
    caption: getString(source.caption),
    cta: getString(source.cta),
    onScreenText: normalizeStringList(source.onScreenText),
  };
}

function toScriptLabPatch(input: ReturnType<typeof normalizeScriptOutput>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries({
      hook: input.hook,
      outline: input.outline.join("\n"),
      script: input.script,
      caption: input.caption,
      cta: input.cta,
      onScreenText: input.onScreenText.join("\n"),
    }).filter(([, value]) => value.trim().length > 0),
  ) as Record<string, JsonValue>;
}

function normalizeScriptLabPatch(input: UpdateScriptLabInput): Partial<ScriptLab> {
  const patch: Partial<ScriptLab> = {};
  const stringFields = ["angle", "hook", "script", "caption", "cta", "notes"] as const;

  for (const field of stringFields) {
    const value = input[field];
    if (typeof value === "string") {
      patch[field] = value;
    }
  }

  const outline = listToText(input.outline);
  if (outline !== undefined) {
    patch.outline = outline;
  }

  const onScreenText = listToText(input.onScreenText);
  if (onScreenText !== undefined) {
    patch.onScreenText = onScreenText;
  }

  return patch;
}

function listToText(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter((item) => item.trim()).join("\n");
  }

  return typeof value === "string" ? value : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateScriptPackage(input: ReturnType<typeof normalizeScriptOutput>) {
  const missing = [
    input.hook ? null : "hook",
    input.script ? null : "script",
  ].filter((field): field is string => Boolean(field));

  if (missing.length > 0) {
    throw new Error(`Generated script package missing required field(s): ${missing.join(", ")}.`);
  }
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function scriptLabToJson(scriptLab: ScriptLab): Record<string, JsonValue> {
  return {
    angle: scriptLab.angle,
    hook: scriptLab.hook,
    outline: scriptLab.outline,
    script: scriptLab.script,
    caption: scriptLab.caption,
    onScreenText: scriptLab.onScreenText,
    cta: scriptLab.cta,
    notes: scriptLab.notes,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
