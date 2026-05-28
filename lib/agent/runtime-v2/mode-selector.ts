import type { CreativeBrief } from "./creative-brief";
import type { AgentGoalRecord, AgentGoalStage } from "./goals";
import { isAssetGenerationRequest } from "./asset-intent";

export type AgentMode = "brainstorm" | "plan" | "goal" | "execute" | "review" | "ask";

export interface AgentModeDecision {
  mode: AgentMode;
  confidence: number;
  reason: string;
  shouldAskQuestion: boolean;
  shouldUseTools: boolean;
  suggestedWorkflow?: string;
  missingCreativeFields?: string[];
  questions?: string[];
  goalStageUpdate?: AgentGoalStage;
}

export interface AgentModeSelectorInput {
  rawMessage: string;
  parsedSlashCommand?: string | null;
  creativeBrief?: CreativeBrief | null;
  missingCreativeFields?: string[];
  activeGoal?: AgentGoalRecord | null;
  projectStateSummary?: string;
  recentConversationState?: unknown;
}

const creativeQuestionsMap: Record<string, string> = {
  contentGoal: "What is the primary action or value you want the viewer to take away from this video? (e.g. drive profile clicks, save the reel, or start a discussion in the comments)",
  coreAngle: "What is the counter-intuitive take or unique perspective we are highlighting? What's the main hook that will make someone stop scrolling?",
  platform: "Which platform are we optimized for? Instagram (visual/aesthetic), TikTok (raw/fast-paced), or YouTube Shorts?",
  durationSeconds: "Are we aiming for a short punchy 15s hook, a standard 30s vlog, or a detailed 60s breakdown?",
  format: "What delivery format matches your style best here? (e.g. talking-head with overlays, screen recording walkthrough, or vlog-style montage)",
  tone: "What vibe or tone do you want to project? Cinematic and premium, raw and authentic, or technical and detailed?",
  viewerEmotion: "What primary emotion do you want to spark in the viewer? (e.g. curiosity, surprise, frustration, or a sense of relief)",
  cta: "What's the final sign-off call-to-action (CTA)? E.g. 'comment KEYWORD for the link' or 'save this for later'?"
};

export function selectAgentMode(input: AgentModeSelectorInput): AgentModeDecision {
  const { rawMessage, parsedSlashCommand, missingCreativeFields } = input;
  const goalStageUpdate = input.activeGoal ? inferGoalStageUpdate(rawMessage) : undefined;

  const brainstormKeywords = /\b(ideas|angle|options|brainstorm|concepts|hooks|don't know|dont know|not sure|suggest)\b/i;
  const reviewKeywords = /\b(critique|improve|review|feedback|analyze|audit|evaluate|is this good|make it better|make this better|make it more|rewrite this|rewrite it)\b/i;
  const planKeywords = /\b(plan|campaign|strategy|outline|roadmap|steps|phase)\b/i;
  const goalKeywords = /\b(end-to-end|end to end|from idea to publish|from idea through publish|idea to publish|help me make|help make|complete this project|finish this project|entire|full workflow|go through)\b/i;
  const executeKeywords = /\b(write|generate|save|update|create|import|export|apply)\b/i;

  // 1. Check critique/review triggers
  if (reviewKeywords.test(rawMessage)) {
    return {
      mode: "review",
      confidence: 0.9,
      reason: "User requested feedback, audit, or review of the content.",
      shouldAskQuestion: false,
      shouldUseTools: /\b(save|update|apply|persist|store)\b/i.test(rawMessage),
      suggestedWorkflow: /\b(script|hook|caption|rewrite|make it|improve)\b/i.test(rawMessage) ? "script" : undefined,
      goalStageUpdate,
    };
  }

  // 2. Check goal triggers before direct execution so end-to-end requests become persistent goals.
  if (goalKeywords.test(rawMessage)) {
    return {
      mode: "goal",
      confidence: 0.88,
      reason: "User requested end-to-end orchestration or structured progress tracking.",
      shouldAskQuestion: false,
      shouldUseTools: false,
      goalStageUpdate: goalStageUpdate ?? "ideating",
    };
  }

  // 3. Check execute triggers (slash command / script / save)
  const isScriptCommand = parsedSlashCommand === "script";
  const isAssetRequest = isAssetGenerationRequest(rawMessage);
  const hasExecuteVerb = executeKeywords.test(rawMessage);

  if (isScriptCommand || hasExecuteVerb || isAssetRequest) {
    const cleanMsg = rawMessage.replace(/^\/[^\s]+/, "").trim();
    const isVague = cleanMsg.length < 15 && (!missingCreativeFields || missingCreativeFields.length > 2);

    if (isScriptCommand && isVague) {
      const missing = missingCreativeFields || [];
      const questions = missing
        .slice(0, 3)
        .map(field => creativeQuestionsMap[field] || `What are your thoughts on the ${field} for this post?`);

      return {
        mode: "ask",
        confidence: 0.9,
        reason: "User requested a script but the input is vague with missing creative fields.",
        shouldAskQuestion: true,
        shouldUseTools: false,
        missingCreativeFields: missing,
        questions: questions.length > 0 ? questions : ["Can you describe what this video is about and what platform/format you have in mind?"],
        goalStageUpdate,
      };
    }

    return {
      mode: "execute",
      confidence: 0.9,
      reason: "User requested generation, updates, or direct file changes with sufficient context.",
      shouldAskQuestion: false,
      shouldUseTools: true,
      suggestedWorkflow: isScriptCommand ? "script" : isAssetRequest ? "asset_generation" : undefined,
      goalStageUpdate,
    };
  }

  // 4. Check plan triggers
  if (planKeywords.test(rawMessage)) {
    return {
      mode: "plan",
      confidence: 0.85,
      reason: "User requested planning, scheduling, steps, or campaign roadmap.",
      shouldAskQuestion: false,
      shouldUseTools: false,
      goalStageUpdate,
    };
  }

  // 5. Check brainstorm triggers
  if (brainstormKeywords.test(rawMessage)) {
    return {
      mode: "brainstorm",
      confidence: 0.9,
      reason: "User explicitly asked for ideas, options, or creative angles.",
      shouldAskQuestion: false,
      shouldUseTools: false,
      goalStageUpdate,
    };
  }

  if (goalStageUpdate) {
    return {
      mode: "goal",
      confidence: 0.78,
      reason: "User appears to be advancing the active goal stage.",
      shouldAskQuestion: false,
      shouldUseTools: false,
      goalStageUpdate,
    };
  }

  // 6. Default Fallback
  return {
    mode: "brainstorm",
    confidence: 0.5,
    reason: "Standard creative conversation routing.",
    shouldAskQuestion: false,
    shouldUseTools: false,
  };
}

function inferGoalStageUpdate(rawMessage: string): AgentGoalStage | undefined {
  if (/\b(script is done|script's done|script complete|script completed|finished the script|saved the script|script saved)\b/i.test(rawMessage)) {
    return "asset_planning";
  }

  if (/\b(brief|audience|positioning|content goal|creative direction)\b/i.test(rawMessage)) {
    return "briefing";
  }

  if (/\b(write|draft|outline|script|hook|caption)\b/i.test(rawMessage)) {
    return "scripting";
  }

  if (/\b(asset plan|shot list|shoot pack|visual plan|b-roll|b roll|storyboard)\b/i.test(rawMessage)) {
    return "asset_planning";
  }

  if (/\b(generate assets|generate image|generate video|generate audio|create assets|asset generation)\b/i.test(rawMessage)) {
    return "generating_assets";
  }

  if (/\b(edit|editing|timeline|rough cut|final cut)\b/i.test(rawMessage)) {
    return "editing";
  }

  if (/\b(publish|posting|post it|schedule|instagram)\b/i.test(rawMessage)) {
    return "publishing";
  }

  if (/\b(analyze|analytics|performance|results|insights)\b/i.test(rawMessage)) {
    return "analyzing";
  }

  if (/\b(goal complete|mark complete|project complete|all done)\b/i.test(rawMessage)) {
    return "complete";
  }

  return undefined;
}
