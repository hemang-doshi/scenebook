import { NextResponse } from "next/server";
import { z } from "zod";

import { mediaModalities } from "@/lib/ai/model-registry";
import { generateProjectMedia } from "@/lib/generation/generate-media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  prompt: z.string().trim().min(1),
  modality: z.enum(mediaModalities),
  modelId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  sceneKey: z.string().trim().min(1).optional(),
  folderId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { id } = await params;
    const body = requestSchema.parse(await request.json());

    const result = await generateProjectMedia({
      projectId: id,
      userId: user.id,
      prompt: body.prompt,
      modality: body.modality,
      modelId: body.modelId,
      provider: body.provider,
      title: body.title,
      sceneKey: body.sceneKey,
      folderId: body.folderId,
    });

    return NextResponse.json({
      generationId: result.generationId,
      assetId: result.assetId,
      url: result.url,
      path: result.path,
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to generate media." },
      { status: 400 },
    );
  }
}

