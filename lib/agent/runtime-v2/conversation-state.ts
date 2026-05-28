import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAgentHistory } from "@/lib/agent/runtime";
import type { AgentMessageRecord, AgentToolCallRecord, AgentThreadRecord } from "@/lib/agent/types";
import type { CreativeBrief } from "./creative-brief";
import { getActiveAgentGoal, type AgentGoalRecord } from "./goals";

export interface ConversationState {
  thread: AgentThreadRecord | null;
  messages: AgentMessageRecord[];
  toolCalls: AgentToolCallRecord[];
  creativeBrief: CreativeBrief | null;
  activeGoal: AgentGoalRecord | null;
}

export async function loadConversationState(
  projectId: string,
  threadId?: string
): Promise<ConversationState> {
  const supabase = await createSupabaseServerClient();

  // Load history (thread, messages, tool calls)
  const history = await getAgentHistory(projectId, threadId);

  // Load creative brief
  const { data: briefData } = await supabase
    .from("project_creative_briefs")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const activeGoal = await getActiveAgentGoal(projectId, history.thread?.id ?? threadId ?? null);

  return {
    thread: history.thread,
    messages: history.messages,
    toolCalls: history.toolCalls,
    creativeBrief: briefData ? (briefData.brief as CreativeBrief) : null,
    activeGoal,
  };
}

export type { AgentGoalRecord };
