import type { CreativeBrief } from "./creative-brief";
import {
  getGoalCompletedSteps,
  getGoalNextActions,
  getGoalStage,
  type AgentGoalRecord,
} from "./goals";

export function buildAgentWorkspaceContext(
  project: {
    title: string;
    format: string;
    platform: string;
    status: string;
    scriptLab?: unknown;
    [key: string]: unknown;
  },
  recentMessages: { role: string; content: string; [key: string]: unknown }[],
  recentToolCalls: { tool_name: string; command?: string | null; status: string; [key: string]: unknown }[],
  creativeBrief: CreativeBrief | null,
  activeGoal: AgentGoalRecord | null
): string {
  const sections: string[] = [];

  // Project Info section
  sections.push(`=== PROJECT INFO ===
Title: ${project.title || "Untitled"}
Format: ${project.format || "N/A"}
Platform: ${project.platform || "N/A"}
Status: ${project.status || "N/A"}`);

  // Creative Brief section
  if (creativeBrief) {
    const briefLines = Object.entries(creativeBrief)
      .filter(([, val]) => val !== undefined && val !== null && val !== "")
      .map(([key, val]) => {
        const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
        return `  ${key}: ${valStr}`;
      });
    if (briefLines.length > 0) {
      sections.push(`=== CREATIVE BRIEF ===\n${briefLines.join("\n")}`);
    }
  }

  // Active Goal section
  if (activeGoal) {
    sections.push(`=== ACTIVE GOAL ===
Goal: ${activeGoal.title}
Status: ${activeGoal.status}
Stage: ${getGoalStage(activeGoal)}
Completed Steps: ${JSON.stringify(getGoalCompletedSteps(activeGoal))}
Next Actions: ${JSON.stringify(getGoalNextActions(activeGoal))}`);
  }

  // Recent Messages
  if (recentMessages && recentMessages.length > 0) {
    const messageLines = recentMessages.slice(-5).map(msg => {
      const truncatedContent =
        msg.content.length > 100 ? `${msg.content.slice(0, 100)}...` : msg.content;
      return `  [${msg.role}]: ${truncatedContent}`;
    });
    sections.push(`=== RECENT MESSAGES ===\n${messageLines.join("\n")}`);
  }

  // Recent Tool Calls
  if (recentToolCalls && recentToolCalls.length > 0) {
    const toolLines = recentToolCalls.slice(-5).map(tool => {
      return `  Tool: ${tool.tool_name}${tool.command ? ` (/${tool.command})` : ""} - ${tool.status}`;
    });
    sections.push(`=== RECENT TOOL CALLS ===\n${toolLines.join("\n")}`);
  }

  return sections.join("\n\n");
}
