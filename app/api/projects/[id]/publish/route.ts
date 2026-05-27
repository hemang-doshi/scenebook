/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCardDetail, updateCard } from "@/lib/data/repository";
import { decryptSecret } from "@/lib/secure-settings";

// Helper to determine if we should simulate the Meta publishing flow
function shouldSimulate() {
  const appId = process.env.META_APP_ID;
  return !appId || appId.includes("placeholder") || appId === "your_meta_app_id";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { socialAccountId, caption } = body;

    if (!socialAccountId) {
      return NextResponse.json({ error: "Missing social account selection." }, { status: 400 });
    }

    const card = await getCardDetail(id);
    if (!card) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Find the exported video asset for this project
    const videoAsset = card.assets.find((asset) => asset.type === "video");
    if (!videoAsset && !shouldSimulate()) {
      return NextResponse.json(
        { error: "No video asset has been exported for this project yet. Please go to the editor and export a video." },
        { status: 400 },
      );
    }

    const videoUrl = videoAsset?.url || "https://example.com/mock-reel-export.mp4";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (shouldSimulate()) {
      // Create simulated publishing container
      const simulatedContainerId = `sim-container-${Date.now()}`;
      const nextJournal = {
        ...card.analyticsJournal,
        instagramContainerId: simulatedContainerId,
        instagramPublishingStart: Date.now(),
        instagramAccountId: socialAccountId,
      };

      await updateCard(id, {
        status: "posting",
        analyticsJournal: nextJournal,
      });

      return NextResponse.json({
        success: true,
        containerId: simulatedContainerId,
        simulated: true,
      });
    }

    // Real Meta publishing flow
    const { data: socialAccount, error: dbError } = await supabase
      .from("creator_social_accounts")
      .select("*")
      .eq("id", socialAccountId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !socialAccount) {
      return NextResponse.json({ error: "Selected social account not found." }, { status: 404 });
    }

    const accessToken = decryptSecret(socialAccount.access_token_encrypted);
    if (!accessToken) {
      return NextResponse.json({ error: "Unable to decrypt social account access token." }, { status: 500 });
    }

    // Step 1: Create a Reels Media Container in Meta Graph API
    const metaContainerUrl = `https://graph.instagram.com/v19.0/${socialAccount.account_id}/media`;
    const finalCaption = caption ?? card.scriptLab.caption ?? "";

    const response = await fetch(metaContainerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: finalCaption,
        share_to_feed: true,
        access_token: accessToken,
      }),
    });

    const metaData = await response.json();
    if (metaData.error) {
      console.error("Meta Reels upload container error:", metaData.error);
      throw new Error(metaData.error.message || "Failed to create media container at Meta.");
    }

    const containerId = metaData.id;

    // Update project state
    const nextJournal = {
      ...card.analyticsJournal,
      instagramContainerId: containerId,
      instagramPublishingStart: Date.now(),
      instagramAccountId: socialAccount.account_id,
    };

    await updateCard(id, {
      status: "posting",
      analyticsJournal: nextJournal,
    });

    return NextResponse.json({
      success: true,
      containerId,
      simulated: false,
    });
  } catch (error: any) {
    console.error("Instagram publish POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start Instagram publishing pipeline." },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get("containerId");
    const socialAccountId = searchParams.get("socialAccountId");

    if (!containerId || !socialAccountId) {
      return NextResponse.json({ error: "Missing query parameters." }, { status: 400 });
    }

    const card = await getCardDetail(id);
    if (!card) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Handle Simulated container status
    if (containerId.startsWith("sim-")) {
      const startTime = card.analyticsJournal.instagramPublishingStart || Date.now();
      const elapsed = Date.now() - startTime;

      if (elapsed >= 5000) {
        // Video finished processing, complete publishing simulated metrics
        const fakeMediaId = `sim-media-${Date.now()}`;
        const nextJournal = {
          ...card.analyticsJournal,
          instagramMediaId: fakeMediaId,
          instagramAccountId: socialAccountId,
          views: Math.floor(Math.random() * 5000) + 1200,
          likes: Math.floor(Math.random() * 600) + 40,
          comments: Math.floor(Math.random() * 60) + 5,
          shares: Math.floor(Math.random() * 45) + 3,
          saves: Math.floor(Math.random() * 30) + 1,
        };

        await updateCard(id, {
          status: "posted",
          analyticsJournal: nextJournal,
        });

        return NextResponse.json({ status: "FINISHED", mediaId: fakeMediaId, simulated: true });
      }

      return NextResponse.json({ status: "IN_PROGRESS", simulated: true });
    }

    // 2. Real Meta polling and publish execution
    const { data: socialAccount, error: dbError } = await supabase
      .from("creator_social_accounts")
      .select("*")
      .eq("id", socialAccountId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !socialAccount) {
      return NextResponse.json({ error: "Selected social account not found." }, { status: 404 });
    }

    const accessToken = decryptSecret(socialAccount.access_token_encrypted);
    if (!accessToken) {
      return NextResponse.json({ error: "Unable to decrypt social account access token." }, { status: 500 });
    }

    // Query Meta Reels container status
    const statusUrl = `https://graph.instagram.com/v19.0/${containerId}?fields=status_code,status,error_message&access_token=${accessToken}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    if (statusData.error) {
      throw new Error(statusData.error.message || "Failed to query container status from Meta.");
    }

    const statusCode = statusData.status_code;

    if (statusCode === "FINISHED") {
      // Reels video finished processing, publish it live!
      const publishUrl = `https://graph.instagram.com/v19.0/${socialAccount.account_id}/media_publish`;
      const publishResponse = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      });

      const publishData = await publishResponse.json();
      if (publishData.error) {
        throw new Error(publishData.error.message || "Failed to publish Reels container.");
      }

      const mediaId = publishData.id;

      // Update card status to posted and store media ID
      const nextJournal = {
        ...card.analyticsJournal,
        instagramMediaId: mediaId,
        instagramAccountId: socialAccount.account_id,
        // Set initial analytics values to 0
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      };

      await updateCard(id, {
        status: "posted",
        analyticsJournal: nextJournal,
      });

      return NextResponse.json({ status: "FINISHED", mediaId });
    } else if (statusCode === "ERROR") {
      // Reels container processing failed on Meta's server
      const errorMessage = statusData.error_message || "Video processing failed on Meta servers.";
      // Reset card status back to scripted/ready_to_shoot so the user can retry
      await updateCard(id, { status: "ready_to_shoot" });
      return NextResponse.json({ status: "ERROR", error: errorMessage });
    }

    // Still processing/uploading (IN_PROGRESS)
    return NextResponse.json({ status: "IN_PROGRESS" });
  } catch (error: any) {
    console.error("Instagram publish GET status error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check publishing container status." },
      { status: 500 },
    );
  }
}
