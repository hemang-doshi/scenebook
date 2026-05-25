import { NextResponse } from "next/server";
import { z } from "zod";

import { generateText } from "@/lib/ai/client";
import { appendProjectMessages } from "@/lib/project-service";

const requestSchema = z.object({
  prompt: z.string().trim().min(1),
  model: z.string().trim().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { prompt, model } = requestSchema.parse(await request.json());
    const systemInstruction =
      "You are SceneBook's project copilot. Respond with concrete next beats, script improvements, or production decisions for the active video project.";

    await appendProjectMessages(id, [{ role: "user", content: prompt, model: model ?? null }]);

    const text = await generateText({
      prompt,
      systemInstruction,
      modelOverride: model,
    });

    await appendProjectMessages(id, [
      {
        role: "assistant",
        content: text,
        provider: "text-chain",
        model: model ?? null,
      },
    ]);

    return NextResponse.json({ text });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to generate project reply." },
      { status: 400 },
    );
  }
}
