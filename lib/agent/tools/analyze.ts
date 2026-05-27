import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import { generateText } from "@/lib/ai/client";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

function cleanJsonString(input: string): string {
  if (!input) return "";
  return input
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export const analyzeTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Content Analyzer",
  command: "analyze",
  description: "Returns AI-generated next-content recommendations from project context.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "none",
  async handler(ctx, input) {
    const project = ctx.project;

    if (!project) {
      return {
        message: "Project context is unavailable, so analysis is limited.",
        output: {
          projectTitle: null,
          currentStatus: null,
          recommendations: [
            "Load the project context before asking for content analysis.",
          ],
          analyticsSummary: null,
        },
      };
    }

    const analytics = project.analyticsJournal;
    const defaultRecommendations = [
      analytics.saves > 0 || analytics.shares > 0
        ? "Build the follow-up around the most reusable tip because saves/shares suggest utility."
        : "Lead with a sharper practical promise because the current project has weak reuse signals.",
      analytics.followUpIdea?.trim()
        ? `Use the stored follow-up angle next: ${analytics.followUpIdea.trim()}`
        : `Create a sequel that extends ${project.title} with one tighter constraint or edge case.`,
      project.aiSuggestions.performanceSummary.trim()
        ? `Keep this lesson in play: ${project.aiSuggestions.performanceSummary.trim()}`
        : "Write the next post with a clearer before/after payoff in the first beat.",
    ];

    if (input.prompt) {
      defaultRecommendations.push(`Bias the next iteration toward: ${input.prompt}`);
    }

    const systemInstruction = "You are a senior social media analyst, creator growth advisor, and data strategist. You query retention signals, compare engagement ratios, and identify precise visual hooks and angles for sequel content.";
    const prompt = `Analyze the performance of this video project and provide specialized creator recommendations for the next iteration.
Project Title: ${project.title}
Status: ${project.status}
Analytics KPI Summary:
- Views: ${analytics.views}
- Likes: ${analytics.likes}
- Comments: ${analytics.comments}
- Shares: ${analytics.shares}
- Saves: ${analytics.saves}
- Creator Reflection: ${analytics.reflection || "None"}
- Follow-up Idea: ${analytics.followUpIdea || "None"}
AI Performance Summary: ${project.aiSuggestions.performanceSummary || "None"}
User directives: ${input.prompt || "None"}

Apply these analytical directives:
1. Examine engagement ratios: High saves/shares signal utility; high comments signal community engagement/controversy; high likes/views signal strong appeal.
2. Formulate 3 distinct sequel/follow-up content strategies: 
   - Strategy A: Iteration adjusting the visual hook based on performance limits.
   - Strategy B: Deeper vertical deep-dive on details that generated saves or comments.
   - Strategy C: Direct sequel concept (e.g. part 2) that expands the narrative with a new angle.

You must return a valid JSON object matching the following structure (do not include markdown wrapping, just raw JSON):
{
  "projectTitle": "${project.title}",
  "currentStatus": "${project.status}",
  "recommendations": [
    "Strategy A: [Specific detailed tip]",
    "Strategy B: [Specific detailed tip]",
    "Strategy C: [Specific detailed tip]"
  ],
  "analyticsSummary": {
    "views": ${analytics.views},
    "likes": ${analytics.likes},
    "comments": ${analytics.comments},
    "shares": ${analytics.shares},
    "saves": ${analytics.saves},
    "reflection": "${analytics.reflection || ""}"
  }
}`;

    let output = {
      projectTitle: project.title,
      currentStatus: project.status,
      recommendations: defaultRecommendations,
      analyticsSummary: {
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        saves: analytics.saves,
        reflection: analytics.reflection,
      },
    };

    try {
      const response = await generateText({
        prompt,
        systemInstruction,
        modelOverride: ctx.selectedModel || undefined,
      });

      const parsed = JSON.parse(cleanJsonString(response));
      if (parsed && typeof parsed === "object") {
        output = {
          projectTitle: parsed.projectTitle || output.projectTitle,
          currentStatus: parsed.currentStatus || output.currentStatus,
          recommendations: parsed.recommendations || output.recommendations,
          analyticsSummary: parsed.analyticsSummary
            ? {
                views: parsed.analyticsSummary.views ?? output.analyticsSummary.views,
                likes: parsed.analyticsSummary.likes ?? output.analyticsSummary.likes,
                comments: parsed.analyticsSummary.comments ?? output.analyticsSummary.comments,
                shares: parsed.analyticsSummary.shares ?? output.analyticsSummary.shares,
                saves: parsed.analyticsSummary.saves ?? output.analyticsSummary.saves,
                reflection: parsed.analyticsSummary.reflection ?? output.analyticsSummary.reflection,
              }
            : output.analyticsSummary,
        };
      }
    } catch (err) {
      console.warn("AI analysis failed, falling back to structured template:", err);
    }

    return {
      message: `Analysis ready for ${project.title}.`,
      output,
    };
  },
};
