/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/secure-settings";

function calculateTrendsFromPosts(posts: any[], currentFollowers: number) {
  const dates: string[] = [];
  const followers: number[] = [];
  const views: number[] = [];
  const engagement: number[] = [];

  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dates.push(dateStr);

    // Followers is flat-lined at current followers count, as historical growth is not fetched
    followers.push(currentFollowers);

    // Sum metrics of posts published on this day
    const dayPosts = posts.filter((p) => {
      const pDate = new Date(p.publishedAt);
      return (
        pDate.getDate() === d.getDate() &&
        pDate.getMonth() === d.getMonth() &&
        pDate.getFullYear() === d.getFullYear()
      );
    });

    if (dayPosts.length === 0) {
      views.push(0);
      engagement.push(0);
    } else {
      const validPosts = dayPosts.filter((p) => p.metrics.views !== null);
      if (validPosts.length === 0) {
        views.push(0);
        engagement.push(0);
      } else {
        const dayViews = validPosts.reduce((sum, p) => sum + (p.metrics.views || 0), 0);
        views.push(dayViews);

        const totalEng = validPosts.reduce(
          (sum, p) =>
            sum +
            (p.metrics.likes || 0) +
            (p.metrics.comments || 0) +
            (p.metrics.shares || 0) +
            (p.metrics.saves || 0),
          0
        );
        const dayEngagementRate = dayViews > 0
          ? parseFloat(((totalEng / dayViews) * 100).toFixed(1))
          : 0;
        engagement.push(dayEngagementRate);
      }
    }
  }

  return { dates, followers, views, engagement };
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

    const body = await request.json().catch(() => ({}));
    const { accountId } = body;

    let query = supabase
      .from("creator_social_accounts")
      .select("*")
      .eq("user_id", user.id);

    if (accountId) {
      query = query.eq("id", accountId);
    } else {
      query = query.order("created_at", { ascending: false }).limit(1);
    }

    const { data: accounts, error: accountError } = await query;
    if (accountError) {
      throw accountError;
    }

    const account = accounts?.[0];
    if (!account) {
      return NextResponse.json({ error: "No connected Instagram account found." }, { status: 400 });
    }

    // 2. Decrypt access token
    const accessToken = decryptSecret(account.access_token_encrypted);
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to decrypt access token." }, { status: 500 });
    }

    // 3. Query Account Profile
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,followers_count&access_token=${accessToken}`
    );
    const profileData = await profileRes.json();
    if (profileData.error) {
      throw new Error(profileData.error.message || "Failed to fetch Instagram profile.");
    }

    // 4. Query Media Feed
    const mediaRes = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=30&access_token=${accessToken}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) {
      throw new Error(mediaData.error.message || "Failed to fetch media feed.");
    }

    const posts = mediaData.data || [];

    // 5. Query Insights (Parallel GET Requests)
    let insightsResults: any[] = [];
    if (posts.length > 0) {
      const insightsPromises = posts.map(async (post: any) => {
        const isReel = post.media_product_type === "REELS";
        const isVideo = post.media_type === "VIDEO";
        
        let metrics = "impressions,reach,saved";
        if (isReel) {
          metrics = "plays,reach,saved,shares";
        } else if (isVideo) {
          metrics = "video_views,reach,saved,shares";
        }

        const url = `https://graph.instagram.com/${post.id}/insights?metric=${metrics}&access_token=${accessToken}`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          return { id: post.id, status: res.status, data };
        } catch (e: any) {
          return { id: post.id, status: 500, error: e.message || "Failed to fetch" };
        }
      });
      insightsResults = await Promise.all(insightsPromises);
    }

    // 6. Error Handling & Per-Post Fallbacks (Resolving Metrics Crash)
    const postsWithInsights = posts.map((post: any, index: number) => {
      let views: number | null = null;
      let reach: number | null = null;
      let saves: number | null = null;
      let shares: number | null = null;
      let impressions: number | null = null;
      let postError: string | null = null;

      const likes = post.like_count || 0;
      const comments = post.comments_count || 0;

      const result = insightsResults[index];
      if (result) {
        if (result.status !== 200 || result.data?.error || result.error) {
          const errMsg = result.data?.error?.message || result.error || "Unsupported metric or access restricted";
          console.warn(`Meta Graph API insights error for post ${post.id} (Status ${result.status}): ${errMsg}.`);
          
          if (errMsg.toLowerCase().includes("before the most recent time") || 
              errMsg.toLowerCase().includes("converted to a business account") ||
              errMsg.toLowerCase().includes("converted to a creator account")) {
            postError = "This post was created prior to converting to a creator/professional account, so detailed metrics are unavailable.";
          } else {
            postError = errMsg;
          }
        } else {
          try {
            const metricsList = result.data.data || [];
            metricsList.forEach((m: any) => {
              const val = m.values?.[0]?.value || 0;
              if (m.name === "plays" || m.name === "video_views") {
                views = val;
              } else if (m.name === "reach") {
                reach = val;
              } else if (m.name === "saved") {
                saves = val;
              } else if (m.name === "shares") {
                shares = val;
              } else if (m.name === "impressions") {
                impressions = val;
              }
            });
          } catch (e: any) {
            console.error(`Failed to parse insights for post ${post.id}:`, e);
            postError = e.message || "Failed to parse insights data";
          }
        }
      } else {
        postError = "Missing insights response from Meta Graph API.";
      }

      return {
        id: post.id,
        title: post.caption ? post.caption.split("\n")[0].substring(0, 80) : "Untitled Post",
        format: post.media_type === "VIDEO" ? "reel" : "image",
        status: "posted",
        publishedAt: post.timestamp,
        permalink: post.permalink || "",
        media_url: post.media_url || "",
        thumbnail_url: post.thumbnail_url || post.media_url || "",
        media_type: post.media_type || "IMAGE",
        error: postError,
        metrics: {
          views,
          likes,
          comments,
          shares,
          saves,
          reach,
          impressions,
        },
      };
    });

    // 7. Aggregate KPIs
    const hasViews = postsWithInsights.some((p: any) => p.metrics.views !== null);
    const totalViews = hasViews 
      ? postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.views || 0), 0)
      : null;

    const totalLikes = postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.likes || 0), 0);
    const totalComments = postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.comments || 0), 0);

    const hasShares = postsWithInsights.some((p: any) => p.metrics.shares !== null);
    const totalShares = hasShares 
      ? postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.shares || 0), 0)
      : null;

    const hasSaves = postsWithInsights.some((p: any) => p.metrics.saves !== null);
    const totalSaves = hasSaves 
      ? postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.saves || 0), 0)
      : null;

    const hasReach = postsWithInsights.some((p: any) => p.metrics.reach !== null);
    const totalReach = hasReach 
      ? postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.reach || 0), 0)
      : null;

    const hasImpressions = postsWithInsights.some((p: any) => p.metrics.impressions !== null);
    const totalImpressions = hasImpressions 
      ? postsWithInsights.reduce((sum: number, p: any) => sum + (p.metrics.impressions || 0), 0)
      : null;

    const followers = profileData.followers_count || 0;
    const totalEngagements = totalLikes + totalComments + (totalShares || 0) + (totalSaves || 0);
    const denominator = totalReach || followers || 1;
    const engagementRate = totalReach !== null || followers > 0
      ? parseFloat(((totalEngagements / denominator) * 100).toFixed(1))
      : null;

    const finalKPIs = {
      followers,
      reach: totalReach,
      impressions: totalImpressions,
      engagementRate,
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
    };

    // 8. Generate Trends
    const trends = calculateTrendsFromPosts(postsWithInsights, followers);

    const lastSyncedAt = new Date().toISOString();

    const cachedPayload = {
      kpis: finalKPIs,
      trends,
      posts: postsWithInsights,
      lastSyncedAt,
    };

    // 9. Save Cache
    const { error: updateError } = await supabase
      .from("creator_social_accounts")
      .update({
        metadata: cachedPayload,
        profile_picture_url: profileData.profile_picture_url || account.profile_picture_url,
        account_name: profileData.name || profileData.username || account.account_name,
        account_username: profileData.username || account.account_username,
        updated_at: lastSyncedAt,
      })
      .eq("id", account.id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      accountId: account.id,
      socialAccountId: account.account_id,
      username: profileData.username || account.account_username,
      name: profileData.name || profileData.username || account.account_name,
      avatarUrl: profileData.profile_picture_url || account.profile_picture_url,
      ...cachedPayload,
    });
  } catch (error: any) {
    console.error("POST /api/analytics/sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync analytics." },
      { status: 500 }
    );
  }
}
