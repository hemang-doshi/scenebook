import type { ProjectWorkspace } from "@/lib/data/repository";
import type { AgentMode, AgentModeDecision } from "@/lib/agent/runtime-v2/mode-selector";
import type { CreativeBrief } from "@/lib/agent/runtime-v2/creative-brief";
import { getToolByName } from "@/lib/agent/runtime-v2/tools/registry";
import type {
  AgentRuntimeToolApprovalPolicy,
  AgentRuntimeToolSideEffect,
} from "@/lib/agent/runtime-v2/tools/types";
import {
  assetGenerationWorkflow,
  getWorkflowByName,
  scriptWorkflow,
  type AgentWorkflow,
} from "@/lib/agent/runtime-v2/workflows";
import type { JsonValue } from "@/lib/types";

export type AgentPlanIntent =
  | "creative_options"
  | "structured_plan"
  | "goal_tracking"
  | "execute_tools"
  | "review_then_update"
  | "ask_questions";

export type AgentPlanStep = {
  id: string;
  kind: "tool";
  toolName: string;
  displayName: string;
  description: string;
  sideEffect: AgentRuntimeToolSideEffect;
  approvalPolicy: AgentRuntimeToolApprovalPolicy;
  requiresApproval: boolean;
};

export type AgentPlanProjectContext = {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: string;
} | null;

export type AgentPlan = {
  mode: AgentMode;
  intent: AgentPlanIntent;
  workflow: AgentWorkflow | null;
  creativeBrief: CreativeBrief;
  rawUserMessage: string;
  projectContext: AgentPlanProjectContext;
  missingCreativeFields: string[];
  questions: string[];
  creativeOptions: string[];
  structuredPlan: string[];
  steps: AgentPlanStep[];
  notes: string[];
};

export type BuildAgentPlanInput = {
  modeDecision: AgentModeDecision;
  workflow?: string | AgentWorkflow | null;
  creativeBrief?: CreativeBrief | null;
  rawUserMessage: string;
  project?: ProjectWorkspace | null;
  parsedSlashCommand?: string | null;
};

const scriptQuestionPriority = ["coreAngle", "platform", "durationSeconds", "format", "tone"];
const assetQuestionPriority = ["modality", "promptOrCreativeDirection", "projectFormat"];

export function buildAgentPlan(input: BuildAgentPlanInput): AgentPlan {
  const creativeBrief = input.creativeBrief ?? {};
  const workflow = resolveWorkflow(input);
  const projectContext = summarizeProject(input.project ?? null);
  const missingCreativeFields = workflow
    ? getMissingFields(workflow, creativeBrief, input.rawUserMessage, input.project ?? null)
    : [];

  const basePlan = createBasePlan(input, workflow, creativeBrief, projectContext, missingCreativeFields);

  if (input.modeDecision.mode === "brainstorm") {
    return {
      ...basePlan,
      intent: "creative_options",
      creativeOptions: buildCreativeOptions(input.rawUserMessage, workflow),
    };
  }

  if (input.modeDecision.mode === "plan") {
    return {
      ...basePlan,
      intent: "structured_plan",
      structuredPlan: buildStructuredPlan(workflow),
    };
  }

  if (input.modeDecision.mode === "goal") {
    const goalTool = getToolByName("create_goal") ?? getToolByName("update_goal");

    return {
      ...basePlan,
      intent: "goal_tracking",
      steps: goalTool ? buildToolSteps([goalTool.name]) : [],
      notes: goalTool ? [] : ["Goal tracking tool is not registered in runtime-v2."],
    };
  }

  if (input.modeDecision.mode === "ask" || (workflow?.name === "script" && missingCreativeFields.length > 0)) {
    return {
      ...basePlan,
      intent: "ask_questions",
      questions: buildQuestions(workflow, missingCreativeFields, input.modeDecision.questions),
      steps: [],
    };
  }

  if (input.modeDecision.mode === "review") {
    return {
      ...basePlan,
      intent: "review_then_update",
      steps: buildReviewSteps(input.rawUserMessage, workflow),
    };
  }

  if (isPublishRequest(input.rawUserMessage)) {
    return {
      ...basePlan,
      intent: "execute_tools",
      steps: buildToolSteps(["prepare_instagram_post", "publish_to_instagram"]),
    };
  }

  if (workflow?.name === "asset_generation") {
    if (missingCreativeFields.length > 0) {
      return {
        ...basePlan,
        intent: "ask_questions",
        questions: buildQuestions(workflow, missingCreativeFields),
      };
    }

    return {
      ...basePlan,
      intent: "execute_tools",
      steps: buildAssetSteps(workflow, creativeBrief),
    };
  }

  if (workflow?.name === "script") {
    return {
      ...basePlan,
      intent: "execute_tools",
      steps: buildToolSteps(workflow.defaultToolSequence),
    };
  }

  return {
    ...basePlan,
    intent: input.modeDecision.shouldUseTools ? "execute_tools" : "structured_plan",
    structuredPlan: input.modeDecision.shouldUseTools ? [] : buildStructuredPlan(null),
  };
}

function createBasePlan(
  input: BuildAgentPlanInput,
  workflow: AgentWorkflow | null,
  creativeBrief: CreativeBrief,
  projectContext: AgentPlanProjectContext,
  missingCreativeFields: string[],
): AgentPlan {
  return {
    mode: input.modeDecision.mode,
    intent: "structured_plan",
    workflow,
    creativeBrief,
    rawUserMessage: input.rawUserMessage,
    projectContext,
    missingCreativeFields,
    questions: [],
    creativeOptions: [],
    structuredPlan: [],
    steps: [],
    notes: [],
  };
}

function resolveWorkflow(input: BuildAgentPlanInput): AgentWorkflow | null {
  if (typeof input.workflow === "object" && input.workflow) {
    return input.workflow;
  }

  const explicitWorkflow = getWorkflowByName(input.workflow ?? input.modeDecision.suggestedWorkflow);
  if (explicitWorkflow) {
    return explicitWorkflow;
  }

  if (input.parsedSlashCommand === "script" || /^\/script\b/i.test(input.rawUserMessage)) {
    return scriptWorkflow;
  }

  if (isAssetRequest(input.rawUserMessage)) {
    return assetGenerationWorkflow;
  }

  return null;
}

function getMissingFields(
  workflow: AgentWorkflow,
  brief: CreativeBrief,
  rawUserMessage: string,
  project: ProjectWorkspace | null,
): string[] {
  return workflow.requiredCreativeFields.filter((field) => {
    if (workflow.name === "asset_generation") {
      return !hasAssetField(field, brief, rawUserMessage, project);
    }

    return !hasCreativeField(field, brief, project);
  });
}

function hasAssetField(
  field: string,
  brief: CreativeBrief,
  rawUserMessage: string,
  project: ProjectWorkspace | null,
): boolean {
  if (field === "modality") {
    return hasValue(brief.modality) || /\b(image|video|audio)\b/i.test(rawUserMessage);
  }

  if (field === "promptOrCreativeDirection") {
    return hasValue(brief.prompt) || hasValue(brief.creativeDirection) || rawUserMessage.trim().length > 20;
  }

  if (field === "projectFormat") {
    return hasValue(brief.projectFormat) || hasValue(brief.format) || hasValue(brief.platform) || Boolean(project?.format || project?.platform);
  }

  return hasCreativeField(field, brief, project);
}

function hasCreativeField(field: string, brief: CreativeBrief, project: ProjectWorkspace | null): boolean {
  if (field === "platform") {
    return hasValue(brief.platform) || Boolean(project?.platform);
  }

  if (field === "format") {
    return hasValue(brief.format) || Boolean(project?.format);
  }

  return hasValue(brief[field]);
}

function hasValue(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function buildQuestions(
  workflow: AgentWorkflow | null,
  missingFields: string[],
  fallbackQuestions: string[] = [],
): string[] {
  if (!workflow) {
    return fallbackQuestions.slice(0, 3);
  }

  const priority = workflow.name === "asset_generation" ? assetQuestionPriority : scriptQuestionPriority;
  const sortedFields = [
    ...priority.filter((field) => missingFields.includes(field)),
    ...missingFields.filter((field) => !priority.includes(field)),
  ];

  const questions = sortedFields
    .map((field) => workflow.questionStrategy.questionsByField[field])
    .filter((question): question is string => Boolean(question));

  return (questions.length > 0 ? questions : fallbackQuestions).slice(0, workflow.questionStrategy.maxQuestions);
}

function buildToolSteps(toolNames: string[]): AgentPlanStep[] {
  return toolNames.flatMap((toolName, index) => {
    const tool = getToolByName(toolName);
    if (!tool) {
      return [];
    }

    return [{
      id: `${index + 1}-${tool.name}`,
      kind: "tool" as const,
      toolName: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      sideEffect: tool.sideEffect,
      approvalPolicy: tool.approvalPolicy,
      requiresApproval: tool.approvalPolicy !== "auto",
    }];
  });
}

function buildAssetSteps(workflow: AgentWorkflow, brief: CreativeBrief): AgentPlanStep[] {
  const toolSequence = hasValue(brief.folderIntent)
    ? ["generate_prompt_json", "generate_media_asset", "create_asset_folder", "attach_asset_to_project"]
    : workflow.defaultToolSequence;

  return buildToolSteps(toolSequence);
}

function buildReviewSteps(rawUserMessage: string, workflow: AgentWorkflow | null): AgentPlanStep[] {
  const isUpdateRequested = /\b(update|save|apply|replace)\b/i.test(rawUserMessage);

  if (workflow?.name === "script" || /\b(script|hook|caption)\b/i.test(rawUserMessage)) {
    return buildToolSteps(isUpdateRequested ? ["critique_script", "update_script_lab"] : ["critique_script"]);
  }

  return [];
}

function buildCreativeOptions(rawUserMessage: string, workflow: AgentWorkflow | null): string[] {
  const subject = rawUserMessage.replace(/^\/\S+\s*/, "").trim() || "this project";
  const workflowLabel = workflow ? workflow.description : "the current creative direction";

  return [
    `Explore three distinct angles for ${subject}.`,
    `Compare platform fit, audience promise, and production effort for ${workflowLabel}.`,
    "Recommend the strongest option before scheduling tool execution.",
  ];
}

function buildStructuredPlan(workflow: AgentWorkflow | null): string[] {
  if (!workflow) {
    return [
      "Clarify the objective and success criteria.",
      "Identify the required workspace context.",
      "List the non-destructive next steps for review.",
    ];
  }

  return workflow.stages.map((stage) => `Plan ${stage.replaceAll("_", " ")}.`);
}

function summarizeProject(project: ProjectWorkspace | null): AgentPlanProjectContext {
  if (!project) {
    return null;
  }

  return {
    id: project.id,
    title: project.title,
    platform: project.platform,
    format: project.format,
    status: project.status,
  };
}

function isAssetRequest(rawUserMessage: string): boolean {
  return /\b(generate|create|make|draft)\b/i.test(rawUserMessage)
    && /\b(asset|image|video|audio|prompt json|prompt)\b/i.test(rawUserMessage);
}

function isPublishRequest(rawUserMessage: string): boolean {
  return /\b(publish|post)\b/i.test(rawUserMessage) && /\b(instagram|ig|insta)\b/i.test(rawUserMessage);
}
