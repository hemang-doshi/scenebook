import { NextResponse } from "next/server";
import { z } from "zod";

import { moveAssetToFolder, removeAssetFromFolder } from "@/lib/assets/asset-folders";

const requestSchema = z.object({
  assetId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  currentFolderId: z.string().uuid().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = requestSchema.parse(await request.json());

    if (body.folderId) {
      await moveAssetToFolder(id, body.assetId, body.folderId);
    } else {
      if (!body.currentFolderId) {
        return NextResponse.json(
          { error: "Provide currentFolderId when removing an asset from a folder." },
          { status: 400 },
        );
      }

      await removeAssetFromFolder(id, body.assetId, body.currentFolderId);
    }

    return NextResponse.json({ ok: true });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to move asset." },
      { status: 400 },
    );
  }
}
