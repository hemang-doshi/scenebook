/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get creator settings
    const { data, error } = await (supabase as any)
      .from("creator_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is code for 0 rows returned
      throw error;
    }

    return NextResponse.json({
      userEmail: user.email,
      geminiApiKey: data?.gemini_api_key || "",
      openrouterApiKey: data?.openrouter_api_key || "",
      nimApiKey: data?.nim_api_key || "",
      creatorContext: data?.creator_context || "",
    });
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

    const { geminiApiKey, openrouterApiKey, nimApiKey, creatorContext } = await request.json();

    const { error } = await (supabase as any).from("creator_settings").upsert({
      user_id: user.id,
      gemini_api_key: geminiApiKey || null,
      openrouter_api_key: openrouterApiKey || null,
      nim_api_key: nimApiKey || null,
      creator_context: creatorContext || null,
      updated_at: new Date().toISOString(),
    });

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
