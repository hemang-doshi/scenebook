import { NextResponse } from "next/server";

import { createInboxItem } from "@/lib/data/repository";
import { createInboxItemSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = createInboxItemSchema.parse(await request.json());
    const item = await createInboxItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to create inbox item." },
      { status: 400 },
    );
  }
}
