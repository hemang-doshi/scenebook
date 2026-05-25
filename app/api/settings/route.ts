/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildSettingsResponse,
  buildSettingsUpsertPayload,
  providerKeys,
  type CreatorSettingsRow,
} from "@/lib/creator-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  creatorContext: z.string().optional(),
  providerTokens: z
    .object(
      Object.fromEntries(providerKeys.map((provider) => [provider, z.string().nullable().optional()])),
    )
    .partial()
    .optional(),
});

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("creator_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json(
      buildSettingsResponse(user.email, (data as CreatorSettingsRow | null | undefined) ?? null),
    );
  } catch (caught) {
    console.error("GET /api/settings error:", caught);
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Failed to load settings." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = requestSchema.parse(await request.json());
    const { data: previous, error: loadError } = await supabase
      .from("creator_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (loadError && loadError.code !== "PGRST116") {
      throw loadError;
    }

    const { error } = await (supabase.from("creator_settings") as any).upsert(
      buildSettingsUpsertPayload(
        user.id,
        (previous as CreatorSettingsRow | null | undefined) ?? null,
        payload,
      ),
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (caught) {
    console.error("POST /api/settings error:", caught);
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Failed to save settings." },
      { status: 500 },
    );
  }
}
