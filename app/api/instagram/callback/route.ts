/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/secure-settings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateVal = searchParams.get("state") || "";
  const [stateUserId, returnTo] = stateVal.split(":");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  const proto = headers.get("x-forwarded-proto") || "http";
  const origin = host.includes("localhost") || host.includes("127.0.0.1")
    ? `${proto}://${host}`
    : `https://${host}`;
  const redirectUri = `${origin}/api/instagram/callback`;
  const targetPath = returnTo === "analytics" ? "analytics" : "settings";
  const settingsUrl = `${origin}/${targetPath}`;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (!code) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram=error&message=No+authorization+code+provided.`,
      );
    }

    if (stateUserId !== user.id) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram=error&message=Invalid+OAuth+state+parameter.`,
      );
    }

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram=error&message=Meta+credentials+not+fully+configured+on+server.`,
      );
    }

    // 1. Exchange authorization code for short-lived Instagram user access token
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: code,
    });

    const shortLivedRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const shortLivedData = await shortLivedRes.json();

    console.log("SceneBook Meta Integration - Short-lived Token API Response:", JSON.stringify(shortLivedData, null, 2));

    if (shortLivedData.error || !shortLivedData.access_token) {
      throw new Error(
        shortLivedData.error_message ||
        shortLivedData.error?.message ||
        "Failed to exchange short-lived token."
      );
    }

    const shortLivedToken = shortLivedData.access_token;

    // 2. Exchange short-lived token for long-lived Instagram user access token
    const longLivedExchangeUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;

    const longLivedRes = await fetch(longLivedExchangeUrl);
    const longLivedData = await longLivedRes.json();

    console.log("SceneBook Meta Integration - Long-lived Token API Response:", JSON.stringify(longLivedData, null, 2));

    if (longLivedData.error || !longLivedData.access_token) {
      throw new Error(longLivedData.error?.message || "Failed to exchange long-lived token.");
    }

    const longLivedToken = longLivedData.access_token;

    // 3. Fetch Instagram profile username and details directly from the Instagram Graph API
    const igInfoUrl = `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${longLivedToken}`;
    const igInfoRes = await fetch(igInfoUrl);
    const igInfo = await igInfoRes.json();

    console.log("SceneBook Meta Integration - Profile Details Response:", JSON.stringify(igInfo, null, 2));

    if (igInfo.error) {
      throw new Error(igInfo.error.message || "Failed to retrieve Instagram profile info.");
    }

    // 4. Encrypt the access token using secure-settings utility
    const encryptedToken = encryptSecret(longLivedToken);
    if (!encryptedToken) {
      throw new Error("Failed to secure the access token.");
    }

    // 5. Upsert the connected account details in the database
    const { error: upsertError } = await supabase.from("creator_social_accounts").upsert(
      {
        user_id: user.id,
        platform: "instagram",
        account_name: igInfo.name || igInfo.username,
        account_username: igInfo.username,
        account_id: igInfo.id,
        access_token_encrypted: encryptedToken,
        profile_picture_url: igInfo.profile_picture_url || null,
        metadata: {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,platform,account_id",
      },
    );

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.redirect(`${settingsUrl}?instagram=success`);
  } catch (error: any) {
    console.error("Instagram OAuth callback error:", error);
    return NextResponse.redirect(
      `${settingsUrl}?instagram=error&message=${encodeURIComponent(
        error?.message || "Internal server error",
      )}`,
    );
  }
}
