import { generateText } from "@/lib/ai/client";
import { buildAgentSystemInstruction } from "@/lib/agent/context-builder";
import type { AgentCommand, PromptJsonOutput } from "@/lib/agent/types";
import type { AgentToolContext } from "@/lib/agent/tools/types";

export async function generateStructuredToolText(
  ctx: AgentToolContext,
  command: AgentCommand,
  prompt: string,
  extraInstruction?: string,
) {
  const systemInstruction = [
    buildAgentSystemInstruction({
      project: ctx.project,
      command,
    }),
    extraInstruction ?? null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return generateText({
    prompt,
    systemInstruction,
    modelOverride: ctx.selectedModels?.chat ?? ctx.selectedModel ?? undefined,
  });
}

export function extractFirstJsonObject(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1] ?? "{}");
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not include valid JSON.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

export async function generateStructuredCommandUpdate<TOutput extends Record<string, unknown>>({
  ctx,
  command,
  prompt,
  normalize,
  extraInstruction,
}: {
  ctx: AgentToolContext;
  command: AgentCommand;
  prompt: string;
  normalize: (input: Record<string, unknown>) => TOutput;
  extraInstruction?: string;
}): Promise<{ output: TOutput; repaired: boolean }> {
  let response = "";
  const structuredInstruction = [
    extraInstruction,
    "This is an internal structured persistence call. Return only JSON that matches the requested schema, even if the visible chat instruction says to use Markdown.",
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    response = await generateStructuredToolText(ctx, command, prompt, structuredInstruction);
    return {
      output: normalize(extractFirstJsonObject(response) as Record<string, unknown>),
      repaired: false,
    };
  } catch (firstError) {
    await ctx.emitProgress?.("repairing schema");
    const repairedResponse = await generateStructuredToolText(
      ctx,
      command,
      [
        "Repair this malformed structured response into valid JSON for the requested schema.",
        "Return only the corrected JSON object. Do not add Markdown or commentary.",
        `Original prompt:\n${prompt}`,
        `Malformed response:\n${response || (firstError instanceof Error ? firstError.message : "unknown parse error")}`,
      ].join("\n\n"),
      structuredInstruction,
    );

    try {
      return {
        output: normalize(extractFirstJsonObject(repairedResponse) as Record<string, unknown>),
        repaired: true,
      };
    } catch (repairError) {
      const message = repairError instanceof Error ? repairError.message : "Model response did not include valid JSON.";
      throw new Error(`Unable to produce valid JSON after repair: ${message}`);
    }
  }
}

export function withStructuredRepairMetadata<TOutput extends Record<string, unknown>>(
  output: TOutput,
  repaired: boolean,
) {
  if (!repaired) {
    return output;
  }

  return {
    ...output,
    metadata: {
      ...(isPlainRecord(output.metadata) ? output.metadata : {}),
      structuredRepairUsed: true,
    },
  };
}

export function stripJsonFence(text: string) {
  return text.replace(/```json[\s\S]*?```/gi, "").trim();
}

export function normalizePromptJsonOutput(input: Record<string, unknown>): PromptJsonOutput {
  const modality: PromptJsonOutput["modality"] =
    input.modality === "audio" || input.modality === "video" ? input.modality : "image";
  const outputBlock = isPlainRecord(input.output) ? input.output : undefined;
  const aspectRatio: NonNullable<PromptJsonOutput["aspect_ratio"]> =
    input.aspect_ratio === "16:9" || input.aspect_ratio === "1:1"
      ? input.aspect_ratio
      : outputBlock?.aspect_ratio === "16:9" || outputBlock?.aspect_ratio === "1:1"
        ? outputBlock.aspect_ratio
        : "9:16";

  const output = {
    kind: "prompt_json" as const,
    modality,
    prompt: typeof input.prompt === "string" ? input.prompt.trim() : "",
    negative_prompt:
      typeof input.negative_prompt === "string" ? input.negative_prompt.trim() : undefined,
    aspect_ratio: aspectRatio,
    width: typeof input.width === "number" ? input.width : typeof outputBlock?.width === "number" ? outputBlock.width : undefined,
    height: typeof input.height === "number" ? input.height : typeof outputBlock?.height === "number" ? outputBlock.height : undefined,
    duration_seconds:
      typeof input.duration_seconds === "number"
        ? input.duration_seconds
        : typeof outputBlock?.duration_seconds === "number"
          ? outputBlock.duration_seconds
          : undefined,
    subject: normalizeStringRecord(input.subject, [
      "primary",
      "age",
      "wardrobe",
      "appearance",
      "action",
      "emotion",
      "color",
    ]),
    scene: normalizeStringRecord(input.scene, [
      "location",
      "setting",
      "time_of_day",
      "environment",
      "background",
      "atmosphere",
    ]),
    camera: normalizeStringRecord(input.camera, [
      "shot_type",
      "angle",
      "lens",
      "framing",
      "movement",
      "focus",
      "reveal",
    ]),
    lighting: normalizeStringRecord(input.lighting, [
      "style",
      "quality",
      "direction",
      "color",
    ]),
    style: normalizeStringRecord(input.style, [
      "aesthetic",
      "color_palette",
      "texture",
    ]),
    output: outputBlock
      ? {
          aspect_ratio: aspectRatio,
          width: typeof outputBlock.width === "number" ? outputBlock.width : typeof input.width === "number" ? input.width : undefined,
          height: typeof outputBlock.height === "number" ? outputBlock.height : typeof input.height === "number" ? input.height : undefined,
          duration_seconds:
            typeof outputBlock.duration_seconds === "number"
              ? outputBlock.duration_seconds
              : typeof input.duration_seconds === "number"
                ? input.duration_seconds
                : undefined,
        }
      : undefined,
    parameters: isPlainRecord(input.parameters) ? normalizeParameters(input.parameters) : undefined,
  };

  if (!output.prompt) {
    throw new Error("Prompt JSON is missing the main prompt field.");
  }

  return output;
}

function normalizeParameters(input: Record<string, unknown>): Record<string, string | number | boolean> | undefined {
  const entries = Object.entries(input).filter(([, value]) => {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<string, string | number | boolean>;
}

function normalizeStringRecord<TKeys extends string>(value: unknown, keys: TKeys[]) {
  if (!isPlainRecord(value)) {
    return undefined;
  }

  const entries: Array<readonly [TKeys, string]> = [];

  for (const key of keys) {
    const raw = value[key];
    if (typeof raw !== "string") {
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    entries.push([key, trimmed] as const);
  }

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<TKeys, string>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
