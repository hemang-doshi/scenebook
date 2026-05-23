import { NextResponse } from "next/server";
import { z } from "zod";

import { addCardAsset } from "@/lib/data/repository";
import { assetTypes } from "@/lib/types";

const schema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().url(),
  type: z.enum(assetTypes).default("link"),
  note: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const card = await addCardAsset(id, payload);
    return NextResponse.json(card, { status: 201 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to add asset." },
      { status: 400 },
    );
  }
}
