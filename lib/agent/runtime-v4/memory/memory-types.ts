import type {
  AgentGoalState,
  CreativeBriefState,
  ProjectConversationContext,
  ProjectConversationMessage,
  ProjectSnapshot,
  ScriptVersionSummary,
} from "@/lib/agent/runtime-v3/types";
import type { CardAsset, JsonValue, ScriptLab, ShootPack } from "@/lib/types";

export const projectMemoryTypes = [
  "creative_direction",
  "user_preference",
  "selected_output",
  "rejected_output",
  "analytics_learning",
  "workflow_checkpoint",
  "integration_connection",
  "agent_summary",
] as const;

export type ProjectMemoryType = (typeof projectMemoryTypes)[number];

export type ProjectMemorySource = "user" | "agent" | "system" | "integration";

export type ProjectMemoryStatus = "active" | "superseded" | "deleted";

export type ProjectMemoryRecord = {
  id: string;
  projectId: string;
  ownerId: string;
  threadId?: string | null;
  runId?: string | null;
  toolCallId?: string | null;
  memoryType: ProjectMemoryType;
  summary: string;
  content: Record<string, JsonValue>;
  source: ProjectMemorySource;
  confidence: number;
  userApproved: boolean;
  supersedesMemoryId?: string | null;
  status: ProjectMemoryStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectOutputMemory = ProjectMemoryRecord & {
  memoryType: "selected_output" | "rejected_output";
  outputType?: string | null;
  outputId?: string | null;
  title?: string | null;
};

export type ProjectRunSummary = {
  id: string;
  ownerId: string;
  projectId: string;
  threadId: string;
  runId: string;
  userGoal: string;
  summary: string;
  actionsTaken: string[];
  workspaceChanges: Array<Record<string, JsonValue>>;
  selectedOutputs: Array<Record<string, JsonValue>>;
  rejectedOutputs: Array<Record<string, JsonValue>>;
  openNextSteps: string[];
  metadata: Record<string, JsonValue>;
  createdAt?: string;
};

export type ProjectIntegrationState = {
  available: false;
  connections: [];
  note: string;
};

export type ProjectMindSnapshot = Omit<ProjectSnapshot, "project" | "memory"> & {
  project: ProjectSnapshot["project"] & {
    ownerId: string;
    topicTags: string[];
    experimentTags: string[];
    createdAt: string;
    updatedAt: string;
  };
  creativeBrief: CreativeBriefState | null;
  activeGoal: AgentGoalState | null;
  scriptLab: ScriptLab;
  scriptVersions: ScriptVersionSummary[];
  shootPack: ShootPack;
  assetLibrary: ProjectSnapshot["assets"];
  selectedOutputs: ProjectOutputMemory[];
  rejectedOutputs: ProjectOutputMemory[];
  durableProjectMemories: ProjectMemoryRecord[];
  recentRunSummaries: ProjectRunSummary[];
  integrationState: ProjectIntegrationState;
  memory: Array<{ summary: string; createdAt?: string; metadata?: Record<string, JsonValue> }>;
  conversationContext?: ProjectConversationContext;
};

export type CompactProjectMind = {
  project: ProjectMindSnapshot["project"];
  creativeBrief: Pick<
    CreativeBriefState,
    "audience" | "platform" | "format" | "tone" | "coreAngle" | "viewerPromise" | "visualStyle" | "cta" | "openQuestions"
  > | null;
  activeGoal: AgentGoalState | null;
  script: {
    hook: string | null;
    hasScript: boolean;
    hasCaption: boolean;
    hasCta: boolean;
    recentVersions: ScriptVersionSummary[];
  };
  shootPack: {
    aRoll: number;
    bRoll: number;
    screenCaptures: number;
    props: number;
    missingAssets: number;
  };
  assetLibrary: ProjectSnapshot["assets"];
  selectedOutputs: Array<Pick<ProjectOutputMemory, "id" | "summary" | "outputType" | "outputId" | "title" | "createdAt">>;
  rejectedOutputs: Array<Pick<ProjectOutputMemory, "id" | "summary" | "outputType" | "outputId" | "title" | "createdAt">>;
  durableMemories: Array<Pick<ProjectMemoryRecord, "id" | "memoryType" | "summary" | "confidence" | "userApproved" | "createdAt">>;
  recentRunSummaries: Array<Pick<ProjectRunSummary, "id" | "userGoal" | "summary" | "actionsTaken" | "openNextSteps" | "createdAt">>;
  conversationContext: ProjectConversationContext;
  integrationState: ProjectIntegrationState;
  readiness: ProjectSnapshot["readiness"];
};

export type ProjectMemoryWriteInput = {
  projectId: string;
  threadId?: string | null;
  runId?: string | null;
  toolCallId?: string | null;
  memoryType: ProjectMemoryType;
  summary: string;
  content?: Record<string, JsonValue>;
  source?: ProjectMemorySource;
  confidence?: number;
  userApproved?: boolean;
  supersedesMemoryId?: string | null;
};

export type ProjectOutputWriteInput = Omit<ProjectMemoryWriteInput, "memoryType"> & {
  memoryType: "selected_output" | "rejected_output";
};

export type ProjectMindStores = {
  getProjectWorkspace?: (projectId: string) => Promise<{
    id: string;
    ownerId: string;
    title: string;
    status: ProjectMindSnapshot["project"]["status"];
    format: ProjectMindSnapshot["project"]["format"];
    platform: ProjectMindSnapshot["project"]["platform"];
    topicTags: string[];
    experimentTags: string[];
    scriptLab: ScriptLab;
    shootPack: ShootPack;
    analyticsJournal: ProjectSnapshot["analytics"];
    assets: CardAsset[];
    createdAt: string;
    updatedAt: string;
  } | null>;
  getAgentHistory?: (projectId: string, threadId?: string) => Promise<{
    messages: Array<{ role: string; content: string; created_at?: string }>;
    toolCalls: Array<{ id: string; tool_name: string; status: string; command?: string | null; created_at?: string }>;
    thread?: unknown;
  }>;
  listRecentProjectMessages?: (projectId: string, limit?: number) => Promise<ProjectConversationMessage[]>;
  getProjectAssetLibrary?: (projectId: string) => Promise<{
    folders: Array<{ id: string; name: string; assets: CardAsset[] }>;
    looseAssets: CardAsset[];
  }>;
  loadCreativeBrief?: (projectId: string) => Promise<CreativeBriefState | null>;
  loadActiveGoal?: (projectId: string) => Promise<AgentGoalState | null>;
  listScriptVersions?: (projectId: string) => Promise<ScriptVersionSummary[]>;
  listProjectMemories?: (projectId: string, limit?: number) => Promise<ProjectMemoryRecord[]>;
  listRecentRunSummaries?: (projectId: string, limit?: number) => Promise<ProjectRunSummary[]>;
};
