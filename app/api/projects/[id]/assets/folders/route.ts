import { NextResponse } from "next/server";
import { z } from "zod";

import { createAssetFolder } from "@/lib/assets/asset-folders";

const requestSchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = requestSchema.parse(await request.json());
    const folder = await createAssetFolder(id, body.name, body.parentId ?? null);

    return NextResponse.json(folder, { status: 201 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to create asset folder." },
      { status: 400 },
    );
  }
}
