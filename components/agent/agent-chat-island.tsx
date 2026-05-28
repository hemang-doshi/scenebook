"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Library, FolderKanban, Bot, Sparkles } from "lucide-react";

import { AgentComposer, type Attachment } from "@/components/agent/agent-composer";
import { ApprovalCard } from "@/components/agent/approval-card";
import { AssetDrawer } from "@/components/agent/asset-drawer";
import { ChatMessage } from "@/components/agent/chat-message";
import { EmptyAgentState } from "@/components/agent/empty-agent-state";
import { ToolCallCard } from "@/components/agent/tool-call-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModelAccordion, type AgentModelSelection } from "@/components/agent/model-accordion";
import { getDefaultChatModel, getDefaultMediaModel } from "@/lib/ai/model-registry";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import { cn } from "@/lib/utils";

export type AgentUiMessage = {
  id: string;
  kind: "message";
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type AgentUiToolCall = {
  id: string;
  kind: "tool";
  toolName: string;
  command?: string | null;
  status: string;
  requiresApproval: boolean;
  output: unknown;
  errorMessage?: string | null;
  createdAt: string;
};

type AgentUiEntry = AgentUiMessage | AgentUiToolCall;

type AgentHistoryResponse = {
  threadId: string | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
  }>;
  toolCalls: Array<{
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
  const messages: AgentUiMessage[] = history.messages.map((message) => ({
    id: message.id,
    kind: "message",
    role: message.role,
    content: message.content,
    createdAt: message.created_at ?? new Date().toISOString(),
    metadata: message.metadata,
  }));
  const toolCalls: AgentUiToolCall[] = history.toolCalls.map((toolCall) => ({
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
  const [threadId, setThreadId] = useState<string | "new-chat" | null>(null);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [entries, setEntries] = useState<AgentUiEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [models, setModels] = useState<AgentModelSelection>(emptyModels);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityState>({ label: "done" });

  const [library, setLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const lastFetchedThreadId = useRef<string | "new-chat" | null>(null);

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
        const placeholderId = `stream-assistant-${Date.now()}`;
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
              } else if (data.type === "chunk" && data.text) {
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

  const [historyVersion, setHistoryVersion] = useState(0);
  const lastFetchedVersion = useRef(0);

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

        setEntries(history.messages.length > 0 || history.toolCalls.length > 0 ? toAgentEntries(history) : []);
        const pendingTool = [...history.toolCalls].reverse().find((toolCall) => toolCall.status === "awaiting_input");
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
  const totalAssets = (library?.folders.reduce((acc, f) => acc + f.assets.length, 0) || 0) + (library?.looseAssets.length || 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem-36px)] w-full bg-[var(--canvas)] overflow-hidden">
      
      {/* Left Sidebar for History & Model Accodion */}
      <div className="w-64 border-r border-[var(--hairline)] bg-[var(--surface-soft)]/60 flex flex-col p-4 shrink-0 h-full justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          <Button
            variant="secondary"
            onClick={() => {
              setThreadId("new-chat");
              setEntries([]);
            }}
            className={cn(
              "w-full text-xs font-mono uppercase tracking-wider h-9 bg-[var(--canvas)] border-[var(--hairline)] hover:border-[var(--ink)] mb-4 shrink-0",
              threadId !== "new-chat" && "text-muted"
            )}
          >
            + New Conversation
          </Button>

          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] px-1 font-bold block mb-2 shrink-0">Recent Conversations</span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThreadId(t.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-md transition-colors truncate font-mono uppercase tracking-wider flex items-center justify-between border",
                  threadId === t.id
                    ? "bg-[var(--canvas)] text-[var(--ink)] font-bold border-[var(--hairline)]"
                    : "text-[var(--ink)]/65 bg-transparent hover:bg-[var(--canvas)] hover:text-[var(--ink)] border-transparent"
                )}
              >
                <span className="truncate">{t.title || `Thread ${t.id.slice(0, 8)}`}</span>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="text-center py-8 text-[10px] text-[var(--muted)] font-mono">
                No chat history yet
              </div>
            )}
          </div>
        </div>

        {/* Model Selection in Sidebar Bottom */}
        <div className="border-t border-[var(--hairline)] pt-4 mt-auto space-y-2 shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] px-1 font-bold block mb-2">Model Configuration</span>
          <ModelAccordion models={models} onChange={setModels} />
        </div>
      </div>

      {/* Right Main Conversational Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Navigation Bar */}
        <header className="h-14 border-b border-[var(--hairline)] px-6 flex items-center justify-between bg-[var(--canvas)] shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3 min-w-0">
            <Bot className="h-4 w-full max-w-4 text-[var(--primary)] shrink-0" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--ink)] truncate">
              {project.title} &bull; Strategic Agent
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/projects/${project.id}`}>
              <Button variant="secondary" className="h-8 px-3 text-[10px] font-mono">
                Project Hub
              </Button>
            </Link>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAssetDrawerOpen((current) => !current)}
                className="h-8 px-3 text-[10px] font-mono bg-[var(--surface-soft)] border border-[var(--hairline)] hover:border-[var(--ink)] flex items-center gap-1.5"
              >
                <Library className="h-3.5 w-3.5 text-[var(--ink)]/70" />
                <span>Assets:</span>
                <span className="rounded-md bg-[var(--canvas)] px-1.5 py-0.5 border border-[var(--hairline)] font-bold font-mono">{library ? totalAssets : "—"}</span>
              </Button>
              <AssetDrawer projectId={project.id} open={isAssetDrawerOpen} onOpenChange={setIsAssetDrawerOpen} />
            </div>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin flex flex-col">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between">
            <div className="w-full flex-1">
              
              {error ? <p className="pb-3 text-xs text-[var(--danger)]">{error}</p> : null}
              
              <div className="mb-4 flex w-full justify-start">
                <Badge className={cn(
                  "border text-[9px] px-2 py-0.5 rounded-[var(--rounded-sm)]",
                  activity.tone === "error"
                    ? "border-[var(--danger)]/30 bg-red-50 text-[var(--danger)]"
                    : activity.tone === "warning"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
                      : "border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--ink)]"
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
                  {entries.map((entry, index) =>
                    entry.kind === "message" ? (
                      <ChatMessage key={entry.id} message={entry} index={index} />
                    ) : (
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
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Composer bottom sticky aligned */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)]/95 to-transparent pointer-events-none z-20">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <AgentComposer
              value={draft}
              onChange={setDraft}
              onSubmit={() => void submitMessage()}
              isSending={isSending}
              models={models}
              onModelsChange={setModels}
              onQuickCommand={(command) => setDraft(`${command} `)}
              editorHref={editorHref}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>
      </div>
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
