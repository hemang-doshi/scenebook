import { NextResponse } from "next/server";
import { z } from "zod";

import { requestAiAssist } from "@/lib/data/repository";

const schema = z.object({
  mode: z.enum([
    "hooks",
    "captions",
    "rewrites",
    "shot-list",
    "follow-up",
    "performance-summary",
  ]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const card = await requestAiAssist(id, payload.mode);
    return NextResponse.json(card);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to generate AI suggestions." },
      { status: 400 },
    );
  }
}
