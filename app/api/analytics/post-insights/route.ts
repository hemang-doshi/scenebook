/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post, averageMetrics } = body;

    if (!post) {
      return NextResponse.json({ error: "Missing post data." }, { status: 400 });
    }

    const { title, metrics, format } = post;
    if (metrics.views === null || metrics.views === undefined) {
      return NextResponse.json({ error: "Cannot perform AI audit on a post without view metrics." }, { status: 400 });
    }

    const avgViews = averageMetrics?.views || 1;
    const avgLikes = averageMetrics?.likes || 1;
    const avgComments = averageMetrics?.comments || 1;

    const viewsDiff = ((metrics.views - avgViews) / avgViews) * 100;
    const likesDiff = ((metrics.likes - avgLikes) / avgLikes) * 100;
    const commentsDiff = ((metrics.comments - avgComments) / avgComments) * 100;

    const prompt = `
You are an expert Instagram content growth analyst. Audit this specific Instagram post performance:

Post: "${title}"
Format: ${format}
Performance Metrics:
- Views: ${metrics.views} (Compared to account avg of ${avgViews}: ${viewsDiff >= 0 ? "+" : ""}${viewsDiff.toFixed(1)}%)
- Likes: ${metrics.likes} (Compared to account avg of ${avgLikes}: ${likesDiff >= 0 ? "+" : ""}${likesDiff.toFixed(1)}%)
- Comments: ${metrics.comments} (Compared to account avg of ${avgComments}: ${commentsDiff >= 0 ? "+" : ""}${commentsDiff.toFixed(1)}%)
- Shares: ${metrics.shares || 0}
- Saves: ${metrics.saves || 0}

Generate a concise 3-bullet action report containing:
1. **Hook Analysis**: Evaluate the hook strength based on the performance and title.
2. **Retention Diagnostic**: Analyze why viewer retention was high or low using views/engagement/saves.
3. **Iterative Next Script Suggestion**: Propose an iteration or sequel script idea, giving an exact new hook line and layout structure.

Keep the audit report sharp, bulleted, professional, and very brief. Return exactly 3 main markdown sections (one for each topic above) and nothing else.
`;

    const audit = await generateText({
      prompt,
      systemInstruction: "You are an expert Instagram growth auditor. You provide highly specific, bulleted, diagnostic feedback for individual social media posts. Do not write introductory or concluding conversational filler.",
    });

    return NextResponse.json({ audit });
  } catch (error: any) {
    console.error("POST /api/analytics/post-insights error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate post audit." },
      { status: 500 }
    );
  }
}
