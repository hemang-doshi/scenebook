import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMediaWithHuggingFace } from "@/lib/ai/huggingface";
import { getDefaultMediaModel, mediaModalities } from "@/lib/ai/model-registry";
import { getActiveProviderToken, type CreatorSettingsRow } from "@/lib/creator-settings";
import {
  ensureAssetInDefaultFolder,
  moveAssetToFolder,
} from "@/lib/assets/asset-folders";
import {
  createGeneratedAssetRecord,
  createGenerationRecord,
  loadCreatorSettingsRow,
  markGenerationCompleted,
  markGenerationFailed,
  uploadGeneratedAsset,
} from "@/lib/project-service";

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
  const { id } = await params;
  const body = requestSchema.parse(await request.json());
  const fallbackModel = getDefaultMediaModel(body.modality);
  let generationId: string | null = null;

  try {
    const { supabase, user, generation } = await createGenerationRecord(id, {
      provider: "huggingface",
      model: body.modelId ?? fallbackModel.id,
      modality: body.modality,
      prompt: body.prompt,
      metadata: {
        provider: body.provider ?? fallbackModel.provider ?? null,
      },
    });
    generationId = generation.id;

    const settingsRow = (await loadCreatorSettingsRow(user.id)) as CreatorSettingsRow | null;
    const token = getActiveProviderToken(settingsRow, "huggingface");

    if (!token) {
      throw new Error("Configure a Hugging Face token in Settings before generating media.");
    }

    const generated = await generateMediaWithHuggingFace({
      token,
      modality: body.modality,
      model: body.modelId ?? fallbackModel.id,
      provider: body.provider ?? fallbackModel.provider,
      prompt: body.prompt,
    });

    const title = body.title ?? `${body.modality} concept`;
    const assetType =
      body.modality === "image" ? "image" : body.modality === "audio" ? "audio" : "video";
    const upload = await uploadGeneratedAsset({
      supabase,
      userId: user.id,
      cardId: id,
      generationId: generation.id,
      title,
      blob: generated.blob,
      extension: generated.extension,
    });

    const asset = await createGeneratedAssetRecord(id, {
      title,
      type: assetType,
      url: upload.publicUrl,
      note: body.prompt,
      storagePath: upload.path,
      sceneKey: body.sceneKey ?? null,
      generationId: generation.id,
      metadata: {
        provider: body.provider ?? fallbackModel.provider ?? null,
        model: body.modelId ?? fallbackModel.id,
        prompt: body.prompt,
        contentType: generated.contentType,
      },
    });

    if (body.folderId) {
      await moveAssetToFolder(id, asset.id, body.folderId);
    } else {
      await ensureAssetInDefaultFolder({
        projectId: id,
        assetId: asset.id,
        type: assetType,
        title,
        modality: body.modality,
      });
    }

    await markGenerationCompleted(generation.id, {
      provider: body.provider ?? fallbackModel.provider ?? null,
      assetPath: upload.path,
      assetUrl: upload.publicUrl,
      assetId: asset.id,
    });

    return NextResponse.json({
      generationId: generation.id,
      assetId: asset.id,
      url: upload.publicUrl,
      path: upload.path,
    });
  } catch (caught) {
    if (generationId) {
      await markGenerationFailed(
        generationId,
        caught instanceof Error ? caught.message : "Unable to generate media.",
      );
    }

    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to generate media." },
      { status: 400 },
    );
  }
}
