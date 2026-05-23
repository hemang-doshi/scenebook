import { NextResponse } from "next/server";

import { getWorkspaceSnapshot } from "@/lib/data/repository";

export async function GET() {
  try {
    const snapshot = await getWorkspaceSnapshot();
    return NextResponse.json(snapshot);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to load workspace." },
      { status: 500 },
    );
  }
}
