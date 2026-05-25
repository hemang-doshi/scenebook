import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/ai/client";

const requestSchema = z.object({
  prompt: z.string().min(1),
  systemInstruction: z.string().optional(),
  modelOverride: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, systemInstruction, modelOverride } = requestSchema.parse(body);

    const text = await generateText({
      prompt,
      systemInstruction,
      modelOverride,
    });

    return NextResponse.json({ text });
  } catch (caught) {
    console.error("AI chat error:", caught);
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "AI generation failed." },
      { status: 400 },
    );
  }
}
