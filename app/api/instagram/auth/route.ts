import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("returnTo") || "settings";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appId = process.env.META_APP_ID;
    const headers = request.headers;
    const host = headers.get("x-forwarded-host") || headers.get("host") || "";
    const proto = headers.get("x-forwarded-proto") || "http";
    const origin = host.includes("localhost") || host.includes("127.0.0.1")
      ? `${proto}://${host}`
      : `https://${host}`;
    const redirectUri = `${origin}/api/instagram/callback`;

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: "Meta App ID or Redirect URI is not configured in environment variables." },
        { status: 500 },
      );
    }

    const state = `${user.id}:${returnTo}`;
    // Direct Instagram Business Login scopes
    const scope = "instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_messages";
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code&scope=${scope}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Instagram Auth initiation error:", error);
    return NextResponse.json({ error: "Failed to initiate Instagram OAuth flow." }, { status: 500 });
  }
}
