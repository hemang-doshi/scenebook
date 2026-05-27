import { NextResponse } from "next/server";

import { getProjectAssetLibrary } from "@/lib/assets/asset-folders";

function isAssetLibraryUnavailable(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message.toLowerCase()
        : "";

  return (
    message.includes("asset_folders") ||
    message.includes("asset_folder_items") ||
    message.includes("asset_versions") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const library = await getProjectAssetLibrary(id).catch((error) => {
      if (isAssetLibraryUnavailable(error)) {
        return {
          folders: [],
          looseAssets: [],
        };
      }

      throw error;
    });

    return NextResponse.json(library);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to load asset library." },
      { status: 400 },
    );
  }
}
