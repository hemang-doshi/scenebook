import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAgentHistory } from "@/lib/agent/runtime";
import type { AgentMessageRecord, AgentToolCallRecord, AgentThreadRecord } from "@/lib/agent/types";
import type { JsonValue } from "@/lib/types";
import type { CreativeBrief } from "./creative-brief";

export interface AgentGoalRecord {
  id: string;
  owner_id: string;
  project_id: string;
  thread_id: string | null;
  title: string;
  status: string;
  completed_steps: JsonValue;
  next_actions: JsonValue;
  metadata: Record<string, JsonValue | undefined>;
  created_at?: string;
  updated_at?: string;
}

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

  // Load active goal
  const { data: goalData } = await supabase
    .from("agent_goals")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1);

  const activeGoal = goalData && goalData.length > 0 ? goalData[0] : null;

  return {
    thread: history.thread,
    messages: history.messages,
    toolCalls: history.toolCalls,
    creativeBrief: briefData ? (briefData.brief as CreativeBrief) : null,
    activeGoal: activeGoal as AgentGoalRecord | null,
  };
}
