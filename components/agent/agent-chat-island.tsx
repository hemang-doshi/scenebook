"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Archive, Bot, Library } from "lucide-react";

import { AgentComposer, type Attachment } from "@/components/agent/agent-composer";
import { ApprovalCard } from "@/components/agent/approval-card";
import { ArtifactPreviewCard } from "@/components/agent/artifact-preview-card";
import { AssetDrawer } from "@/components/agent/asset-drawer";
import { ChatMessage } from "@/components/agent/chat-message";
import { EmptyAgentState } from "@/components/agent/empty-agent-state";
import { useChatAutoscroll } from "@/components/agent/use-chat-autoscroll";
import { PatchPreviewCard } from "@/components/agent/patch-preview-card";
import { ToolCallCard } from "@/components/agent/tool-call-card";
import { WorkflowCard } from "@/components/agent/workflow-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentModelSelection } from "@/components/agent/model-accordion";
import { ProjectMindPanel } from "@/components/agent/project-mind-panel";
import type {
  AgentTimelineEntry,
  AgentUiEntry,
  AgentUiMessage,
  AgentUiToolCall,
  MemoryTimelineEntry,
} from "@/components/agent/types";
import {
  activityForRuntimeV4Event,
  runtimeV4EventFromLegacyPacket,
  runtimeV4EventFromPacket,
  timelineEntriesFromRuntimeV4Event,
} from "@/components/agent/runtime-v4-event-adapter";
import { humanize, normalizeTimelineEntry, stringValue } from "@/components/agent/timeline-normalizers";
import { upsertTimelineEntries } from "@/components/agent/timeline-merge";
import { getDefaultChatModel, getDefaultMediaModel } from "@/lib/ai/model-registry";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import { cn } from "@/lib/utils";

export type { AgentUiMessage, AgentUiToolCall } from "@/components/agent/types";

type AgentHistoryResponse = {
  threadId: string | null;
  entries?: unknown[];
  messages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
  }>;
  toolCalls?: Array<{
    id: string;
    tool_name: string;
    command?: string | null;
    status: string;
    requires_approval: boolean;
    output?: unknown;
    error_message?: string | null;
    created_at?: string;
  }>;
};

type AgentPostResponse = {
  threadId: string;
  message: string;
  tool?: {
    id: string;
    command?: string | null;
    status: string;
    toolName: string;
    requiresApproval: boolean;
    errorMessage?: string | null;
    result: {
      output: unknown;
    };
  };
};

type ActivityState = {
  label: string;
  tone?: "default" | "error" | "warning";
};

const emptyModels: AgentModelSelection = {
  chat: getDefaultChatModel().id,
  image: getDefaultMediaModel("image").id,
  video: getDefaultMediaModel("video").id,
  audio: getDefaultMediaModel("audio").id,
};

function sortEntries(entries: AgentUiEntry[]) {
  return [...entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function toAgentEntries(history: AgentHistoryResponse): AgentUiEntry[] {
  const timelineEntries = Array.isArray(history.entries)
    ? history.entries
        .map(normalizeTimelineEntry)
        .filter((entry): entry is AgentTimelineEntry => Boolean(entry))
    : [];

  if (timelineEntries.length > 0) {
    return upsertTimelineEntries([], timelineEntries);
  }

  const messages: AgentUiMessage[] = (history.messages ?? []).map((message) => ({
    id: message.id,
    kind: "message",
    role: message.role,
    content: message.content,
    createdAt: message.created_at ?? new Date().toISOString(),
    metadata: message.metadata,
  }));
  const toolCalls: AgentUiToolCall[] = (history.toolCalls ?? []).map((toolCall) => ({
    id: toolCall.id,
    kind: "tool",
    toolName: toolCall.tool_name,
    command: toolCall.command,
    status: toolCall.status,
    requiresApproval: toolCall.requires_approval,
    output: toolCall.output ?? {},
    errorMessage: toolCall.error_message,
    createdAt: toolCall.created_at ?? new Date().toISOString(),
  }));

  return sortEntries([...messages, ...toolCalls]);
}

type ThreadInfo = { id: string; title: string | null; updated_at: string };

export function AgentChatIsland({ project }: { project: ProjectWorkspace }) {
  const [refreshedProject, setRefreshedProject] = useState<ProjectWorkspace | null>(null);
  const activeProject = refreshedProject?.id === project.id ? refreshedProject : project;
  const [threadId, setThreadId] = useState<string | "new-chat" | null>(null);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [entries, setEntries] = useState<AgentUiEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [models, setModels] = useState<AgentModelSelection>(emptyModels);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityState>({ label: "done" });
  const [historyVersion, setHistoryVersion] = useState(0);

  const [library, setLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const lastFetchedThreadId = useRef<string | "new-chat" | null>(null);
  const lastFetchedVersion = useRef(0);
  const { containerRef, bottomRef, handleScroll } = useChatAutoscroll(entries, isSending);

  const loadThreadsList = useCallback(async () => {
    try {
      const response = await fetchJson<{ threads: ThreadInfo[] }>(`/api/projects/${project.id}/agent?listThreads=true`);
      setThreads(response.threads || []);
    } catch (err) {
      console.warn("Failed to load threads list:", err);
    }
  }, [project.id]);

  const loadAssets = useCallback(async () => {
    try {
      const data = await fetchJson<ProjectAssetLibrary>(`/api/projects/${project.id}/assets`);
      setLibrary(data);
    } catch (err) {
      console.warn("Failed to load assets for summary:", err);
    }
  }, [project.id]);

  const loadProject = useCallback(async () => {
    try {
      const nextProject = await fetchJson<ProjectWorkspace>(`/api/projects/${project.id}`);
      setRefreshedProject(nextProject);
    } catch (err) {
      console.warn("Failed to refresh project mind:", err);
    }
  }, [project.id]);

  const refreshProjectSurfaces = useCallback(() => {
    setHistoryVersion((version) => version + 1);
    void loadAssets();
    void loadProject();
  }, [loadAssets, loadProject]);

  const archiveThread = useCallback(async (thread: ThreadInfo) => {
    await fetchJson(`/api/projects/${project.id}/agent`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "archiveThread",
        threadId: thread.id,
      }),
    });

    setThreads((current) => current.filter((item) => item.id !== thread.id));

    if (threadId === thread.id) {
      setThreadId("new-chat");
      setEntries([]);
      lastFetchedThreadId.current = "new-chat";
    }

    void loadThreadsList();
  }, [loadThreadsList, project.id, threadId]);

  // Load threads list and asset library on mount and when project changes
  useEffect(() => {
    Promise.resolve().then(() => {
      void loadThreadsList();
      void loadAssets();
    });
  }, [project.id, loadThreadsList, loadAssets]);

  async function submitMessage() {
    const message = draft.trim();

    if (!message) {
      return;
    }

    const createdAt = new Date().toISOString();
    const localUserMessage: AgentUiMessage = {
      id: `local-user-${createdAt}`,
      kind: "message",
      role: "user",
      content: message,
      createdAt,
      metadata: attachments.length > 0 ? { attachments } : undefined,
    };

    setEntries((current) => sortEntries([...current, localUserMessage]));
    const currentAttachments = [...attachments];
    setDraft("");
    setAttachments([]);
    setIsSending(true);
    setError(null);
    setActivity(getActivityForDraft(message));

    try {
      const response = await fetch(`/api/projects/${project.id}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: threadId === "new-chat" ? undefined : (threadId ?? undefined),
          message,
          models,
          attachments: currentAttachments,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Request failed.");
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        const placeholderId = `stream-assistant-${createdAt}`;
        const placeholderMessage: AgentUiMessage = {
          id: placeholderId,
          kind: "message",
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        };
        setEntries((current) => sortEntries([...current, placeholderMessage]));

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No readable stream in response.");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let sawToolEvent = false;
        let sawRuntimeV4TimelineEvent = false;
        let sawRuntimeV4FinalResponse = false;
        let sawRuntimeV4RunCompleted = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) {
              continue;
            }
            const rawData = trimmed.slice(6);
            try {
              const data = JSON.parse(rawData);
              if (data.type === "meta") {
                if (data.threadId) {
                  setThreadId(data.threadId);
                  lastFetchedThreadId.current = data.threadId;
                  void loadThreadsList();
                }
              } else if (data.type === "run_started") {
                if (data.threadId) {
                  setThreadId(data.threadId);
                  lastFetchedThreadId.current = data.threadId;
                  void loadThreadsList();
                }
                setActivity({ label: "thinking" });
              } else if (data.type === "v4_event") {
                const event = runtimeV4EventFromPacket(data);
                const eventType = stringValue(event.type);
                sawRuntimeV4TimelineEvent ||= eventType !== "final_response" && eventType !== "run_completed";
                const eventThreadId = stringValue(event.threadId) ?? stringValue(event.thread_id);
                if (eventThreadId) {
                  setThreadId(eventThreadId);
                  lastFetchedThreadId.current = eventThreadId;
                  void loadThreadsList();
                }

                const eventActivity = activityForRuntimeV4Event(event);
                if (eventActivity) {
                  setActivity(eventActivity);
                }

                if (eventType === "final_response") {
                  sawRuntimeV4FinalResponse = true;
                  const responseText = stringValue(event.response) ?? stringValue(event.message);
                  if (responseText) {
                    setEntries((current) =>
                      current.map((entry) =>
                        entry.id === placeholderId && entry.kind === "message"
                          ? { ...entry, content: entry.content + responseText }
                          : entry
                      )
                    );
                  }
                }

                if (eventType === "run_failed") {
                  const eventError = stringValue(event.error) ?? stringValue(event.message);
                  if (eventError) {
                    setError(eventError);
                  }
                }

                if (eventType === "run_completed") {
                  sawRuntimeV4RunCompleted = true;
                  setActivity({ label: "done" });
                }

                const timelineEntries = timelineEntriesFromRuntimeV4Event(event);
                if (timelineEntries.length > 0) {
                  if (timelineEntries.some((entry) => entry.kind === "tool")) {
                    sawToolEvent = true;
                  }
                  setEntries((current) => upsertTimelineEntries(current, timelineEntries));
                }
              } else if (data.type === "chunk" && data.text) {
                setActivity({ label: "thinking" });
                setEntries((current) =>
                  current.map((entry) =>
                    entry.id === placeholderId && entry.kind === "message"
                      ? { ...entry, content: entry.content + data.text }
                      : entry
                  )
                );
              } else if (data.type === "message_delta" && data.text) {
                if (sawRuntimeV4FinalResponse) {
                  continue;
                }
                setActivity({ label: "thinking" });
                setEntries((current) =>
                  current.map((entry) =>
                    entry.id === placeholderId && entry.kind === "message"
                      ? { ...entry, content: entry.content + data.text }
                      : entry
                  )
                );
              } else if (data.type === "tool" && data.tool) {
                const tool = data.tool as AgentPostResponse["tool"];
                sawToolEvent = true;
                if (tool) {
                  if (tool.status === "awaiting_input") {
                    setActivity({ label: "awaiting input", tone: "warning" });
                  } else if (tool.status === "awaiting_approval") {
                    setActivity({ label: "draft ready", tone: "warning" });
                  } else if (tool.status === "running") {
                    const output = tool.result?.output as Record<string, unknown> | undefined;
                    setActivity({
                      label: typeof output?.activity === "string" ? output.activity : "working",
                    });
                  } else if (
                    tool.status === "failed" &&
                    tool.result?.output &&
                    (tool.result.output as Record<string, unknown>).kind === "media_error"
                  ) {
                    setActivity({ label: "generation failed", tone: "error" });
                  } else {
                    setActivity({ label: "done" });
                  }

                  setEntries((current) =>
                    sortEntries([
                      ...current.filter((entry) => entry.kind !== "tool" || entry.id !== tool.id),
                      {
                        id: tool.id,
                        kind: "tool",
                        toolName: tool.toolName,
                        command: tool.command,
                        status: tool.status,
                        requiresApproval: tool.requiresApproval,
                        output: tool.result?.output ?? tool.result ?? {},
                        errorMessage: "errorMessage" in tool ? (tool as { errorMessage?: string | null }).errorMessage : null,
                        createdAt: new Date().toISOString(),
                      },
                    ])
                  );
                }
              } else if (
                data.type === "tool_planned" ||
                data.type === "tool_running" ||
                data.type === "tool_completed" ||
                data.type === "tool_failed" ||
                data.type === "approval_required"
              ) {
                if (sawRuntimeV4TimelineEvent) {
                  continue;
                }
                const richEvent = runtimeV4EventFromLegacyPacket(data);
                const richEntries = richEvent ? timelineEntriesFromRuntimeV4Event(richEvent) : [];

                sawToolEvent = true;
                const richActivity = richEvent ? activityForRuntimeV4Event(richEvent) : null;
                if (richActivity) {
                  setActivity(richActivity);
                } else {
                  setActivity({ label: "working" });
                }

                if (richEntries.length > 0) {
                  setEntries((current) => upsertTimelineEntries(current, richEntries));
                }
              } else if (data.type === "run_completed") {
                if (sawRuntimeV4RunCompleted) {
                  continue;
                }
                if (data.threadId) {
                  setThreadId(data.threadId);
                  lastFetchedThreadId.current = data.threadId;
                }
                setActivity({ label: "done" });
                void loadThreadsList();
              } else if (data.type === "run_failed") {
                setActivity({ label: "error", tone: "error" });
                if (typeof data.error === "string") {
                  setError(data.error);
                }
              }
            } catch (err) {
              console.warn("Failed to parse stream packet:", rawData, err);
            }
          }
        }
        if (!sawToolEvent) {
          setActivity({ label: "done" });
        }
      } else {
        const data = (await response.json()) as AgentPostResponse;
        setThreadId(data.threadId);
        lastFetchedThreadId.current = data.threadId;
        void loadThreadsList();
        if (data.tool?.status === "awaiting_input") {
          setActivity({ label: "awaiting input", tone: "warning" });
        } else if (data.tool?.status === "awaiting_approval") {
          setActivity({ label: "draft ready", tone: "warning" });
        } else if (
          data.tool?.status === "failed" &&
          data.tool.result?.output &&
          (data.tool.result.output as Record<string, unknown>).kind === "media_error"
        ) {
          setActivity({ label: "generation failed", tone: "error" });
        } else if (
          data.tool?.result?.output &&
          (data.tool.result.output as Record<string, unknown>).kind === "media_asset"
        ) {
          setActivity({ label: "saving asset" });
          await loadAssets();
          setActivity({ label: "done" });
        } else {
          setActivity({ label: "done" });
        }

        setEntries((current) => {
          const nextEntries = [...current];

          if (data.message) {
            nextEntries.push({
              id: `assistant-${data.threadId}-${Date.now()}`,
              kind: "message",
              role: "assistant",
              content: data.message,
              createdAt: new Date().toISOString(),
            });
          }

          if (data.tool) {
            nextEntries.push({
              id: data.tool.id,
              kind: "tool",
              toolName: data.tool.toolName,
              command: data.tool.command,
              status: data.tool.status,
              requiresApproval: data.tool.requiresApproval,
              output: data.tool.result?.output ?? data.tool.result ?? {},
              errorMessage: "errorMessage" in data.tool ? (data.tool as { errorMessage?: string | null }).errorMessage : null,
              createdAt: new Date().toISOString(),
            });
          }

          return sortEntries(nextEntries);
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send message.");
      setActivity({ label: "error", tone: "error" });
    } finally {
      setIsSending(false);
    }
  }

  // Load history whenever the selected threadId or historyVersion changes
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (threadId === "new-chat") {
        setEntries([]);
        setIsLoadingHistory(false);
        lastFetchedThreadId.current = "new-chat";
        lastFetchedVersion.current = historyVersion;
        setActivity({ label: "done" });
        return;
      }

      if (
        threadId !== null &&
        threadId === lastFetchedThreadId.current &&
        historyVersion === lastFetchedVersion.current
      ) {
        return;
      }

      setIsLoadingHistory(true);
      setError(null);

      try {
        const url = threadId
          ? `/api/projects/${project.id}/agent?threadId=${threadId}`
          : `/api/projects/${project.id}/agent`;
        const history = await fetchJson<AgentHistoryResponse>(url);

        if (cancelled) {
          return;
        }

        const fetchedId = history.threadId;
        lastFetchedThreadId.current = fetchedId;
        lastFetchedVersion.current = historyVersion;

        if (threadId === null) {
          setThreadId(fetchedId || "new-chat");
        }

        const loadedEntries = toAgentEntries(history);
        setEntries(loadedEntries);
        const pendingTool = [...(history.toolCalls ?? [])].reverse().find((toolCall) => toolCall.status === "awaiting_input");
        setActivity(pendingTool ? { label: "awaiting input", tone: "warning" } : { label: "done" });
      } catch (caught) {
        if (!cancelled) {
          setEntries([]);
          setError(caught instanceof Error ? caught.message : "Unable to load agent history.");
          setActivity({ label: "error", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [project.id, threadId, historyVersion, project]);

  const hasMessages = entries.length > 0;
  const editorHref = `/editor/${project.id}`;
  const totalAssets =
    (library?.folders?.reduce((acc, folder) => acc + folder.assets.length, 0) || 0) +
    (library?.looseAssets?.length || 0);

  return (
    <div className="flex h-[calc(100vh-72px)] w-full overflow-hidden bg-transparent">
      
      {/* Left Sidebar for History */}
      <div className="hidden h-full w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[rgba(255,255,255,.035)] p-4 md:flex">
        <div className="flex flex-col flex-1 min-h-0">
          <Button
            variant="secondary"
            onClick={() => {
              setThreadId("new-chat");
              setEntries([]);
            }}
            className={cn(
              "mb-4 h-9 min-h-9 w-full shrink-0 px-3 py-1 text-xs font-mono uppercase tracking-[.07em]",
              threadId !== "new-chat" && "text-muted"
            )}
          >
            + New Conversation
          </Button>

          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] px-1 font-bold block mb-2 shrink-0">Recent Conversations</span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center rounded-md border",
                  threadId === t.id
                    ? "border-[var(--blue)]/40 bg-[var(--blue)]/12 text-[var(--blue-2)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:bg-[rgba(255,255,255,.055)] hover:text-[var(--ink)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setThreadId(t.id)}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-left text-xs font-mono uppercase tracking-wider"
                >
                  <span className="truncate">{t.title || `Thread ${t.id.slice(0, 8)}`}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Archive ${t.title || `Thread ${t.id.slice(0, 8)}`}`}
                  onClick={() => {
                    void archiveThread(t);
                  }}
                  className="mr-2 rounded p-1 text-[var(--muted)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {threads.length === 0 && (
              <div className="text-center py-8 text-[10px] text-[var(--muted)] font-mono">
                No chat history yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Main Conversational Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Navigation Bar */}
        <header className="z-10 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(255,255,255,.025)] px-3 py-3 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Bot className="h-4 w-full max-w-4 shrink-0 text-[var(--blue)]" />
            <div className="min-w-0">
              <h2 className="truncate text-xs font-bold font-mono uppercase tracking-[.07em] text-[var(--ink)]">
                {activeProject.title} / Strategic Agent
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={editorHref}>
              <Button variant="secondary" className="h-8 px-3 text-[10px] font-mono">
                Editor
              </Button>
            </Link>
            <Link href={`/projects/${project.id}`}>
              <Button variant="secondary" className="hidden h-8 px-3 text-[10px] font-mono sm:inline-flex">
                Project Hub
              </Button>
            </Link>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAssetDrawerOpen((current) => !current)}
                className="flex h-8 min-h-8 items-center gap-1.5 border border-[var(--line)] bg-[rgba(255,255,255,.045)] px-3 py-1 text-[10px] font-mono"
              >
                <Library className="h-3.5 w-3.5 text-[var(--blue-2)]" />
                <span>Assets:</span>
                <span className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,.055)] px-1.5 py-0.5 font-bold font-mono">{library ? totalAssets : "-"}</span>
              </Button>
              <AssetDrawer projectId={project.id} open={isAssetDrawerOpen} onOpenChange={setIsAssetDrawerOpen} />
            </div>
          </div>
        </header>

        {/* Conversation Area */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex flex-1 flex-col overflow-y-auto px-3 py-4 scrollbar-thin sm:px-6 sm:py-6"
        >
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between">
            <div className="w-full flex-1">
              
              {error ? <p className="pb-3 text-xs text-[var(--danger)]">{error}</p> : null}
              
              <div className="mb-4 flex w-full justify-start">
                <Badge className={cn(
                  "border text-[9px] px-2 py-0.5 rounded-[var(--rounded-sm)]",
                  activity.tone === "error"
                    ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]"
                    : activity.tone === "warning"
                      ? "border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)]"
                      : "border-[var(--line)] bg-[rgba(255,255,255,.045)] text-[var(--muted)]"
                )}>
                  {activity.label.toUpperCase()}
                </Badge>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
                </div>
              ) : !hasMessages ? (
                <EmptyAgentState />
              ) : (
                <div className="space-y-6 pb-40">
                  {entries.map((entry, index) => {
                    if (entry.kind === "message") {
                      return <ChatMessage key={entry.id} message={entry} index={index} />;
                    }

                    if (entry.kind === "workflow") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <WorkflowCard entry={entry} />
                          </div>
                        </div>
                      );
                    }

                    if (entry.kind === "patch") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <PatchPreviewCard
                              entry={entry}
                              projectId={project.id}
                              onRefresh={refreshProjectSurfaces}
                            />
                          </div>
                        </div>
                      );
                    }

                    if (entry.kind === "artifact") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <ArtifactPreviewCard entry={entry} />
                          </div>
                        </div>
                      );
                    }

                    if (entry.kind === "memory") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <MemoryTimelineCard entry={entry} />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={entry.id} className="flex justify-start">
                        <div className="w-full">
                          {entry.requiresApproval ? (
                            <ApprovalCard
                              toolCall={entry}
                              projectId={project.id}
                              onRefresh={() => setHistoryVersion((v) => v + 1)}
                            />
                          ) : (
                            <ToolCallCard toolCall={entry} onQuickCommand={setDraft} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Composer bottom sticky aligned */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[var(--bg)] via-[rgba(7,8,11,.92)] to-transparent p-3 pointer-events-none sm:p-6">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <AgentComposer
              value={draft}
              onChange={setDraft}
              onSubmit={() => void submitMessage()}
              isSending={isSending}
              models={models}
              onModelsChange={setModels}
              onQuickCommand={(command) => setDraft(`${command} `)}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>
      </div>

      <ProjectMindPanel project={activeProject} />
    </div>
  );
}

function MemoryTimelineCard({ entry }: { entry: MemoryTimelineEntry }) {
  return (
    <div className="grid gap-1 rounded-[var(--rounded-lg)] border border-[var(--hairline)] bg-[var(--canvas)] p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55">
          {entry.memoryType ? humanize(entry.memoryType) : "Memory"}
        </p>
        <Badge className="border border-[var(--hairline)] bg-[var(--surface-soft)] text-[10px] text-[var(--ink)]/75">
          saved
        </Badge>
      </div>
      {entry.title ? <p className="text-sm font-semibold text-[var(--ink)]">{entry.title}</p> : null}
      <p className="text-xs leading-relaxed text-[var(--ink)]/85">{entry.summary}</p>
    </div>
  );
}

function getActivityForDraft(message: string): ActivityState {
  if (!message.startsWith("/")) {
    return { label: "thinking" };
  }

  const command = message.split(/\s+/)[0];
  if (command === "/generate-image") return { label: "generating image" };
  if (command === "/generate-video") return { label: "generating video" };
  if (command === "/generate-audio") return { label: "generating audio" };
  return { label: `running ${command}` };
}
