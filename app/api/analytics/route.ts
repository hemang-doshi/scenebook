/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapCardRow } from "@/lib/data/mappers";

// Helper to generate simulated historic trends over the last 30 days
function generateSimulatedTrends(baseFollowers: number, baseViews: number) {
  const dates: string[] = [];
  const followers: number[] = [];
  const views: number[] = [];
  const engagement: number[] = [];

  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));

    // Follower growth simulation
    const followerGrowth = Math.floor(Math.sin(i / 3) * 15 + 20) + (29 - i) * 8;
    followers.push(baseFollowers - (29 - i) * 12 + followerGrowth);

    // Views simulation
    const dailyViews = Math.floor(Math.abs(Math.cos(i / 2)) * (baseViews / 10) + Math.random() * 500);
    views.push(dailyViews);

    // Engagement simulation
    engagement.push(parseFloat((Math.sin(i / 5) * 0.8 + 4.2 + Math.random() * 0.5).toFixed(1)));
  }

  return { dates, followers, views, engagement };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch connected social accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("creator_social_accounts")
      .select("*")
      .eq("user_id", user.id);

    if (accountsError) {
      throw accountsError;
    }

    // 2. Fetch all content cards
    const { data: cards, error: cardsError } = await supabase
      .from("content_cards")
      .select("*")
      .eq("owner_id", user.id);

    if (cardsError) {
      throw cardsError;
    }

    const mappedCards = (cards || []).map(mapCardRow);

    // 3. Aggregate metrics for each connected account
    const analyticsData = (accounts || []).map((account) => {
      const metadata = account.metadata as any;
      if (metadata && typeof metadata === "object" && metadata.kpis && metadata.posts) {
        return {
          accountId: account.id,
          socialAccountId: account.account_id,
          username: account.account_username,
          name: account.account_name,
          avatarUrl: account.profile_picture_url,
          kpis: metadata.kpis,
          trends: metadata.trends,
          posts: metadata.posts,
          lastSyncedAt: metadata.lastSyncedAt || null,
        };
      }

      return {
        accountId: account.id,
        socialAccountId: account.account_id,
        username: account.account_username,
        name: account.account_name,
        avatarUrl: account.profile_picture_url,
        kpis: {
          followers: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
          views: 0,
          likes: 0,
          comments: 0,
        },
        trends: {
          dates: [],
          views: [],
          followers: [],
          engagement: [],
        },
        posts: [],
        lastSyncedAt: null,
      };
    });

    return NextResponse.json(analyticsData);
  } catch (error: any) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load analytics metrics." },
      { status: 500 },
    );
  }
}
