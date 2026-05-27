import { generateMediaWithHuggingFace } from "@/lib/ai/huggingface";
import { getDefaultMediaModel, type MediaModality } from "@/lib/ai/model-registry";
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

export async function generateProjectMedia({
  projectId,
  userId,
  prompt,
  modality,
  modelId,
  provider,
  title,
  sceneKey,
  folderId,
}: {
  projectId: string;
  userId: string;
  prompt: string;
  modality: MediaModality;
  modelId?: string;
  provider?: string;
  title?: string;
  sceneKey?: string;
  folderId?: string;
}) {
  const fallbackModel = getDefaultMediaModel(modality);
  const resolvedModelId = modelId ?? fallbackModel.id;
  const resolvedProvider = provider ?? fallbackModel.provider ?? "huggingface";
  let generationId: string | null = null;

  try {
    const { supabase: rawSupabase, user, generation } = await createGenerationRecord(projectId, {
      provider: "huggingface",
      model: resolvedModelId,
      modality,
      prompt,
      metadata: {
        provider: resolvedProvider,
      },
    });
    generationId = generation.id;

    const settingsRow = (await loadCreatorSettingsRow(userId)) as CreatorSettingsRow | null;
    const token = getActiveProviderToken(settingsRow, "huggingface");

    if (!token) {
      throw new Error("Configure a Hugging Face token in Settings before generating media.");
    }

    const generated = await generateMediaWithHuggingFace({
      token,
      modality,
      model: resolvedModelId,
      provider: resolvedProvider,
      prompt,
    });

    const resolvedTitle = title ?? `${modality} concept`;
    const assetType =
      modality === "image" ? "image" : modality === "audio" ? "audio" : "video";

    const upload = await uploadGeneratedAsset({
      supabase: rawSupabase,
      userId: user.id,
      cardId: projectId,
      generationId: generation.id,
      title: resolvedTitle,
      blob: generated.blob,
      extension: generated.extension,
    });

    const asset = await createGeneratedAssetRecord(projectId, {
      title: resolvedTitle,
      type: assetType,
      url: upload.publicUrl,
      note: prompt,
      storagePath: upload.path,
      sceneKey: sceneKey ?? null,
      generationId: generation.id,
      metadata: {
        provider: resolvedProvider,
        model: resolvedModelId,
        prompt,
        contentType: generated.contentType,
      },
    });

    let resolvedFolderId = folderId;
    let folderName = "Default";

    if (folderId) {
      await moveAssetToFolder(projectId, asset.id, folderId);
      const folderClient = rawSupabase as unknown as {
        from: (table: string) => {
          select: (cols?: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{ data: { name: string } | null; error: unknown }>;
            };
          };
        };
      };
      const { data: folder } = await folderClient
        .from("asset_folders")
        .select("name")
        .eq("id", folderId)
        .single();
      if (folder) {
        folderName = folder.name;
      }
    } else {
      const folder = await ensureAssetInDefaultFolder({
        projectId,
        assetId: asset.id,
        type: assetType,
        title: resolvedTitle,
        modality,
      });
      resolvedFolderId = folder.id;
      folderName = folder.name;
    }

    await markGenerationCompleted(generation.id, {
      provider: resolvedProvider,
      assetPath: upload.path,
      assetUrl: upload.publicUrl,
      assetId: asset.id,
    });

    return {
      generationId: generation.id,
      assetId: asset.id,
      url: upload.publicUrl,
      path: upload.path,
      folderId: resolvedFolderId ?? null,
      folderName,
      model: resolvedModelId,
      provider: resolvedProvider,
      prompt,
    };
  } catch (caught) {
    if (generationId) {
      await markGenerationFailed(
        generationId,
        caught instanceof Error ? caught.message : "Unable to generate media.",
      );
    }
    throw caught;
  }
}
