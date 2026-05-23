import { NextResponse } from "next/server";

import { convertInboxItemToCard } from "@/lib/data/repository";
import { createNoteCardFromInboxSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = createNoteCardFromInboxSchema.parse({
      ...(await request.json()),
      inboxItemId: id,
    });
    const card = await convertInboxItemToCard(body);
    return NextResponse.json(card, { status: 201 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to convert inbox item." },
      { status: 400 },
    );
  }
}
