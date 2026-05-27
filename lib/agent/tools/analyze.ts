import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

export const analyzeTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Content Analyzer",
  command: "analyze",
  description: "Returns deterministic next-content recommendations from project context.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "none",
  handler(ctx, input) {
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
    const recommendations = [
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
      recommendations.push(`Bias the next iteration toward: ${input.prompt}`);
    }

    return {
      message: `Analysis ready for ${project.title}.`,
      output: {
        projectTitle: project.title,
        currentStatus: project.status,
        recommendations,
        analyticsSummary: {
          views: analytics.views,
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          saves: analytics.saves,
          reflection: analytics.reflection,
        },
      },
    };
  },
};
