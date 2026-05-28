/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CardAsset, JsonValue } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AssetFolderRecord = {
  id: string;
  owner_id: string;
  project_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  metadata: Record<string, JsonValue>;
  created_at: string;
  updated_at: string;
};

export type AssetFolderItemRecord = {
  id: string;
  owner_id: string;
  folder_id: string;
  asset_id: string;
  sort_order: number;
  created_at: string;
};

export type AssetVersionRecord = {
  id: string;
  owner_id: string;
  project_id: string;
  asset_id: string;
  generation_id: string | null;
  url: string;
  model: string | null;
  provider: string | null;
  prompt: string | null;
  metadata: Record<string, JsonValue>;
  created_at: string;
};

export type ProjectAssetLibrary = {
  folders: Array<
    AssetFolderRecord & {
      assets: CardAsset[];
      childFolders: AssetFolderRecord[];
    }
  >;
  looseAssets: CardAsset[];
};

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

function getTable(supabase: SupabaseClient, table: string) {
  return (supabase as any).from(table);
}

function isAssetFolderInfraUnavailable(error: unknown) {
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
    message.includes("relation") ||
    message.includes("schema cache")
  );
}

function mapAssetRow(row: any): CardAsset {
  return {
    id: row.id,
    cardId: row.card_id,
    type: row.type,
    title: row.title,
    url: row.url,
    note: row.note,
    storagePath: row.storage_path,
    source: row.source,
    sceneKey: row.scene_key,
    metadata: row.metadata ?? {},
    generationId: row.generation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function folderNameForAssetType(type: CardAsset["type"], title?: string) {
  if (type === "image" || type === "thumbnail") {
    return "Images";
  }

  if (type === "video") {
    return title?.toLowerCase().includes("b-roll") ? "B-roll" : "Videos";
  }

  if (type === "audio") {
    return "Audio";
  }

  if (type === "document" || type === "link") {
    return "Prompts";
  }

  return "Assets";
}

export function getDefaultAssetFolderName(input: {
  type: CardAsset["type"];
  title?: string;
  modality?: string | null;
}) {
  if (input.modality === "audio") {
    return "Audio";
  }

  if (input.modality === "video") {
    return input.title?.toLowerCase().includes("b-roll") ? "B-roll" : "Videos";
  }

  if (input.modality === "image") {
    return "Images";
  }

  return folderNameForAssetType(input.type, input.title);
}

export async function listProjectAssetFolders(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);
  const { data, error } = await getTable(supabase, "asset_folders")
    .select("*")
    .eq("owner_id", user.id)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AssetFolderRecord[];
}

export async function createAssetFolder(projectId: string, name: string, parentId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);
  const { data, error } = await getTable(supabase, "asset_folders")
    .insert({
      owner_id: user.id,
      project_id: projectId,
      name,
      parent_id: parentId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create asset folder.");
  }

  return data as AssetFolderRecord;
}

export async function getOrCreateAssetFolder(projectId: string, name: string, parentId?: string | null) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Asset folder name is required.");
  }

  const folders = await listProjectAssetFolders(projectId);
  const normalizedParentId = parentId ?? null;
  const existing = folders.find((folder) =>
    folder.name.toLowerCase() === normalizedName.toLowerCase() &&
    (folder.parent_id ?? null) === normalizedParentId
  );

  if (existing) {
    return {
      folder: existing,
      alreadyExisted: true,
    };
  }

  return {
    folder: await createAssetFolder(projectId, normalizedName, normalizedParentId),
    alreadyExisted: false,
  };
}

export async function getOrCreateAssetFolderPath(
  projectId: string,
  path: string | string[],
  parentId?: string | null,
) {
  const parts = (Array.isArray(path) ? path : path.split("/"))
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Asset folder path is required.");
  }

  let currentParentId = parentId ?? null;
  let finalFolder: AssetFolderRecord | null = null;
  let alreadyExisted = true;

  for (const part of parts) {
    const result = await getOrCreateAssetFolder(projectId, part, currentParentId);
    finalFolder = result.folder;
    currentParentId = result.folder.id;
    alreadyExisted = alreadyExisted && result.alreadyExisted;
  }

  if (!finalFolder) {
    throw new Error("Unable to resolve asset folder path.");
  }

  return {
    folder: finalFolder,
    path: parts.join(" / "),
    alreadyExisted,
  };
}

async function getOrCreateFolder(projectId: string, name: string) {
  const result = await getOrCreateAssetFolder(projectId, name, null);
  return result.folder;
}

export async function moveAssetToFolder(projectId: string, assetId: string, folderId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);

  const { data: folder, error: folderError } = await getTable(supabase, "asset_folders")
    .select("*")
    .eq("id", folderId)
    .eq("owner_id", user.id)
    .eq("project_id", projectId)
    .single();

  if (folderError || !folder) {
    throw folderError ?? new Error("Asset folder not found.");
  }

  const { error: deleteError } = await getTable(supabase, "asset_folder_items")
    .delete()
    .eq("owner_id", user.id)
    .eq("asset_id", assetId);

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await getTable(supabase, "asset_folder_items").insert({
    owner_id: user.id,
    folder_id: folderId,
    asset_id: assetId,
  });

  if (insertError) {
    throw insertError;
  }
}

export async function removeAssetFromFolder(projectId: string, assetId: string, folderId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);

  const { data: folder, error: folderError } = await getTable(supabase, "asset_folders")
    .select("id")
    .eq("id", folderId)
    .eq("owner_id", user.id)
    .eq("project_id", projectId)
    .single();

  if (folderError || !folder) {
    throw folderError ?? new Error("Asset folder not found.");
  }

  const { error } = await getTable(supabase, "asset_folder_items")
    .delete()
    .eq("owner_id", user.id)
    .eq("folder_id", folderId)
    .eq("asset_id", assetId);

  if (error) {
    throw error;
  }
}

export async function createAssetVersion(
  projectId: string,
  assetId: string,
  input: {
    generationId?: string | null;
    url: string;
    model?: string | null;
    provider?: string | null;
    prompt?: string | null;
    metadata?: Record<string, JsonValue>;
  },
) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);
  const { data, error } = await getTable(supabase, "asset_versions")
    .insert({
      owner_id: user.id,
      project_id: projectId,
      asset_id: assetId,
      generation_id: input.generationId ?? null,
      url: input.url,
      model: input.model ?? null,
      provider: input.provider ?? null,
      prompt: input.prompt ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create asset version.");
  }

  return data as AssetVersionRecord;
}

export async function ensureAssetInDefaultFolder(input: {
  projectId: string;
  assetId: string;
  type: CardAsset["type"];
  title?: string;
  modality?: string | null;
}) {
  const folder = await getOrCreateFolder(
    input.projectId,
    getDefaultAssetFolderName({
      type: input.type,
      title: input.title,
      modality: input.modality,
    }),
  );

  await moveAssetToFolder(input.projectId, input.assetId, folder.id);
  return folder;
}

export async function getProjectAssetLibrary(projectId: string): Promise<ProjectAssetLibrary> {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);
  const assetsResult = await getTable(supabase, "card_assets")
    .select("*")
    .eq("owner_id", user.id)
    .eq("card_id", projectId)
    .order("created_at", { ascending: true });

  if (assetsResult.error) {
    throw assetsResult.error;
  }

  const assets = ((assetsResult.data ?? []) as any[]).map(mapAssetRow);

  const [foldersResult, folderItemsResult] = await Promise.all([
    getTable(supabase, "asset_folders")
      .select("*")
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    getTable(supabase, "asset_folder_items")
      .select("*")
      .eq("owner_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (foldersResult.error ?? folderItemsResult.error) {
    const infraError = foldersResult.error ?? folderItemsResult.error;

    if (isAssetFolderInfraUnavailable(infraError)) {
      return {
        folders: [],
        looseAssets: assets,
      };
    }

    throw infraError;
  }

  const folders = (foldersResult.data ?? []) as AssetFolderRecord[];
  const folderItems = (folderItemsResult.data ?? []) as AssetFolderItemRecord[];
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const folderAssets = new Set(folderItems.map((item) => item.asset_id));

  return {
    folders: folders.map((folder) => ({
      ...folder,
      assets: folderItems
        .filter((item) => item.folder_id === folder.id)
        .map((item) => assetsById.get(item.asset_id))
        .filter((asset): asset is CardAsset => Boolean(asset)),
      childFolders: folders.filter((candidate) => candidate.parent_id === folder.id),
    })),
    looseAssets: assets.filter((asset) => !folderAssets.has(asset.id)),
  };
}
