/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/secure-settings";
import {
  buildInstagramRequestOrigin,
  normalizeInstagramOAuthError,
  sanitizeInstagramApiError,
} from "@/lib/instagram/oauth";

function redirectWithOAuthError(input: {
  settingsUrl: string;
  message: string;
}) {
  const notice = normalizeInstagramOAuthError(input.message);
  return NextResponse.redirect(
    `${input.settingsUrl}?instagram=error&reason=${encodeURIComponent(notice.code)}&message=${encodeURIComponent(input.message)}`,
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateVal = searchParams.get("state") || "";
  const [stateUserId, returnTo] = stateVal.split(":");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const origin = buildInstagramRequestOrigin(request.headers);
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
      return redirectWithOAuthError({
        settingsUrl,
        message: "No authorization code provided.",
      });
    }

    if (stateUserId !== user.id) {
      return redirectWithOAuthError({
        settingsUrl,
        message: "Invalid OAuth state parameter.",
      });
    }

    if (!appId || !appSecret || !redirectUri) {
      return redirectWithOAuthError({
        settingsUrl,
        message: "Meta credentials not fully configured on server.",
      });
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

    if (shortLivedData.error || !shortLivedData.access_token) {
      console.error("Instagram short-lived token exchange failed:", sanitizeInstagramApiError(shortLivedData));
      throw new Error(shortLivedData.error_message || shortLivedData.error?.message || "Failed to exchange short-lived token.");
    }

    const shortLivedToken = shortLivedData.access_token;

    // 2. Exchange short-lived token for long-lived Instagram user access token
    const longLivedExchangeUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;

    const longLivedRes = await fetch(longLivedExchangeUrl);
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error || !longLivedData.access_token) {
      console.error("Instagram long-lived token exchange failed:", sanitizeInstagramApiError(longLivedData));
      throw new Error(longLivedData.error?.message || "Failed to exchange long-lived token.");
    }

    const longLivedToken = longLivedData.access_token;

    // 3. Fetch Instagram profile username and details directly from the Instagram Graph API
    const igInfoUrl = `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${longLivedToken}`;
    const igInfoRes = await fetch(igInfoUrl);
    const igInfo = await igInfoRes.json();

    if (igInfo.error) {
      console.error("Instagram profile lookup failed:", sanitizeInstagramApiError(igInfo));
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
    return redirectWithOAuthError({
      settingsUrl,
      message: error?.message || "Internal server error",
    });
  }
}
