import { NextResponse } from "next/server";

import { getProjectAssetLibrary } from "@/lib/assets/asset-folders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const library = await getProjectAssetLibrary(id);

    return NextResponse.json(library);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to load asset library." },
      { status: 400 },
    );
  }
}
