/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountData } = body;

    if (!accountData) {
      return NextResponse.json({ error: "Missing account data for analysis." }, { status: 400 });
    }

    const { username, name, kpis, posts } = accountData;

    const reachDisplay = kpis.reach !== null && kpis.reach !== undefined ? kpis.reach.toLocaleString() : "N/A (Pre-conversion account or data missing)";
    const impressionsDisplay = kpis.impressions !== null && kpis.impressions !== undefined ? kpis.impressions.toLocaleString() : "N/A";
    const engagementDisplay = kpis.engagementRate !== null && kpis.engagementRate !== undefined ? `${kpis.engagementRate}%` : "N/A";
    const viewsDisplay = kpis.views !== null && kpis.views !== undefined ? kpis.views.toLocaleString() : "N/A";

    const postsDisplay = (posts || [])
      .map((p: any) => {
        if (p.error) {
          return `- "${p.title}" (${p.format}): [Metrics Unavailable - ${p.error}] (Likes: ${p.metrics.likes || 0}, Comments: ${p.metrics.comments || 0})`;
        }
        const v = p.metrics.views !== null && p.metrics.views !== undefined ? p.metrics.views : "N/A";
        const sh = p.metrics.shares !== null && p.metrics.shares !== undefined ? p.metrics.shares : "N/A";
        const sa = p.metrics.saves !== null && p.metrics.saves !== undefined ? p.metrics.saves : "N/A";
        return `- "${p.title}" (${p.format}): Views: ${v}, Likes: ${p.metrics.likes || 0}, Comments: ${p.metrics.comments || 0}, Shares: ${sh}, Saves: ${sa}`;
      })
      .join("\n");

    const prompt = `
You are the Lead Social Media Growth Strategist and AI Content Analyst at SceneBook. 
Analyze the following Instagram account performance data and generate a comprehensive, professional performance audit and strategy report.

Account Profile: @${username} (${name})
KPIs (Last 30 Days):
- Followers: ${kpis.followers}
- Reach: ${reachDisplay}
- Impressions: ${impressionsDisplay}
- Engagement Rate: ${engagementDisplay}
- Total Views: ${viewsDisplay}
- Total Likes: ${kpis.likes}
- Total Comments: ${kpis.comments}

Recent Reels/Posts Performance Data:
${postsDisplay}

Based on this data, write a strategy report with the following structure:
1. **Performance Summary**: A detailed analysis of the account's overall performance. Compare views vs. engagement, and identify retention signals (which posts had the highest save/share ratio).
2. **Top-Performing Formats & Topics**: Highlight which titles, hooks, and formats (Reels, posts) performed best. Detail why you think they succeeded.
3. **Sequel & Hook Recommendations**: Provide 3 concrete content ideas (with suggested hooks, visual pacing, and outlines) that acts as sequels or iterations to the top-performing posts.
4. **Pacing & Hook Optimization Advice**: Actionable advice on scripting, editing, pacing, and hooks to improve retention and engagement on upcoming projects.

Keep the tone expert, analytical, and highly actionable. Format the entire response in clean, premium Markdown. Do not include introductory or concluding conversational filler. Start directly with the report title.
`;

    const report = await generateText({
      prompt,
      systemInstruction:
        "You are an expert Instagram growth analyst. You deliver data-driven audits and content script iterations. Use concise, impactful language.",
    });

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("AI Insights route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate AI insights." },
      { status: 500 },
    );
  }
}
