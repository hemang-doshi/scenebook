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

    // 1. Fetch connected social accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("creator_social_accounts")
      .select("*")
      .eq("user_id", user.id);

    if (accountsError) {
      throw accountsError;
    }

    // 2. Fetch all content cards
    const { error: cardsError } = await supabase
      .from("content_cards")
      .select("*")
      .eq("owner_id", user.id);

    if (cardsError) {
      throw cardsError;
    }

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
