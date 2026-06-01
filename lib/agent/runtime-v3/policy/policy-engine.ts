import type { AgentTool, PolicyResult, ProjectSnapshot } from "@/lib/agent/runtime-v3/types";
import type { JsonValue } from "@/lib/types";

function jsonSafe(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
}

function isFinalized(status: string) {
  return ["ready_to_shoot", "shot", "editing", "posting", "posted", "analyzed", "archived"].includes(status);
}

export function checkPolicy(input: {
  tool: AgentTool;
  toolInput: unknown;
  snapshot: ProjectSnapshot;
}): PolicyResult {
  const { tool, snapshot } = input;

  if (tool.availability !== "available") {
    return {
      allowed: false,
      requiresApproval: false,
      risk: "blocked",
      reason: `${tool.displayName} is ${tool.availability}.`,
    };
  }

  if (tool.sideEffect === "publish") {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "high",
      reason: "Publishing creates an external side effect and requires approval.",
    };
  }

  if (tool.sideEffect === "delete" || tool.sideEffect === "editor_write") {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "high",
      reason: "Destructive or editor-write actions require approval.",
    };
  }

  if (tool.approvalPolicy === "always") {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "medium",
      reason: `${tool.displayName} is configured to require approval.`,
    };
  }

  if (
    tool.name === "update_script_lab" &&
    tool.approvalPolicy === "ask_if_overwrite" &&
    isFinalized(String(snapshot.project.status))
  ) {
    return {
      allowed: true,
      requiresApproval: true,
      risk: "medium",
      reason: "This project is past scripting, so overwriting Script Lab needs approval.",
      preview: {
        before: {
          hook: snapshot.scriptLab.hook,
          script: snapshot.scriptLab.script,
          caption: snapshot.scriptLab.caption,
          cta: snapshot.scriptLab.cta,
        },
        after: jsonSafe(input.toolInput),
      },
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    risk: tool.sideEffect === "none" ? "low" : "medium",
    reason: "Tool is allowed.",
  };
}
