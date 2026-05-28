/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { CardAsset, GenerationRecord } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "asset";
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

export async function loadCreatorSettingsRow(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("creator_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

export async function createGenerationRecord(
  cardId: string,
  input: Pick<GenerationRecord, "provider" | "model" | "modality" | "prompt"> & {
    metadata?: GenerationRecord["metadata"];
  },
) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);

  const generationTable = supabase.from("generation_records") as any;
  const { data, error } = await generationTable
    .insert({
      owner_id: user.id,
      card_id: cardId,
      provider: input.provider,
      model: input.model,
      modality: input.modality,
      prompt: input.prompt,
      status: "queued",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single() as {
      data: Database["public"]["Tables"]["generation_records"]["Row"] | null;
      error: Error | null;
    };

  if (error || !data) {
    throw error ?? new Error("Unable to create generation record.");
  }

  return { supabase, user, generation: data };
}

export async function markGenerationCompleted(
  generationId: string,
  metadata?: GenerationRecord["metadata"],
) {
  const supabase = await createSupabaseServerClient();
  const generationTable = supabase.from("generation_records") as any;
  const { error } = await generationTable
    .update({
      status: "completed",
      metadata: metadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationId) as { error: Error | null };

  if (error) {
    throw error;
  }
}

export async function markGenerationFailed(
  generationId: string,
  errorMessage: string,
  metadata?: GenerationRecord["metadata"],
) {
  const supabase = await createSupabaseServerClient();
  const generationTable = supabase.from("generation_records") as any;
  const { error } = await generationTable
    .update({
      status: "failed",
      error_message: errorMessage,
      metadata: metadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationId) as { error: Error | null };

  if (error) {
    throw error;
  }
}

export async function uploadGeneratedAsset(input: {
  supabase: SupabaseClient;
  userId: string;
  cardId: string;
  generationId: string;
  title: string;
  blob: Blob;
  extension: string;
}) {
  const path = `${input.userId}/${input.cardId}/${input.generationId}-${slugifySegment(input.title)}.${input.extension}`;
  const bytes = Buffer.from(await input.blob.arrayBuffer());
  const { error } = await input.supabase.storage.from("project-assets").upload(path, bytes, {
    contentType: input.blob.type || undefined,
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = input.supabase.storage.from("project-assets").getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}

export async function createGeneratedAssetRecord(
  cardId: string,
  asset: Pick<CardAsset, "title" | "type" | "url" | "note"> & {
    storagePath: string;
    sceneKey?: string | null;
    generationId: string;
    metadata?: CardAsset["metadata"];
  },
) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(supabase);

  const { data, error } = await (supabase.from("card_assets") as any)
    .insert({
      owner_id: user.id,
      card_id: cardId,
      title: asset.title,
      type: asset.type,
      url: asset.url,
      note: asset.note ?? "",
      storage_path: asset.storagePath,
      source: "generated",
      scene_key: asset.sceneKey ?? null,
      generation_id: asset.generationId,
      metadata: asset.metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create generated asset record.");
  }

  return data as Database["public"]["Tables"]["card_assets"]["Row"];
}
