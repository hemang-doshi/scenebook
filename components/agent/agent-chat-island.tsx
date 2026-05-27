"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PanelLeftClose } from "lucide-react";

import { AgentComposer } from "@/components/agent/agent-composer";
import { ApprovalCard } from "@/components/agent/approval-card";
import { AssetDrawer } from "@/components/agent/asset-drawer";
import { ChatMessage } from "@/components/agent/chat-message";
import { EmptyAgentState } from "@/components/agent/empty-agent-state";
import { ToolCallCard } from "@/components/agent/tool-call-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomSelect } from "@/components/ui/custom-select";
import { getDefaultChatModel, getDefaultMediaModel } from "@/lib/ai/model-registry";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";

import type { AgentModelSelection } from "@/components/agent/model-accordion";

export type AgentUiMessage = {
  id: string;
  kind: "message";
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
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
    result: {
      output: unknown;
    };
  };
};

const emptyModels: AgentModelSelection = {
  chat: getDefaultChatModel().id,
  image: getDefaultMediaModel("image").id,
  video: getDefaultMediaModel("video").id,
  audio: getDefaultMediaModel("audio").id,
};

function toLegacyMessages(project: ProjectWorkspace): AgentUiMessage[] {
  return project.messages.map((message) => ({
    id: `legacy-${message.id}`,
    kind: "message",
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [entries, setEntries] = useState<AgentUiEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [models, setModels] = useState<AgentModelSelection>(emptyModels);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadThreadsList = useCallback(async () => {
    try {
      const response = await fetchJson<{ threads: ThreadInfo[] }>(`/api/projects/${project.id}/agent?listThreads=true`);
      setThreads(response.threads || []);
    } catch (err) {
      console.warn("Failed to load threads list:", err);
    }
  }, [project.id]);

  async function reloadHistoryForThread(targetThreadId: string | null) {
    setIsLoadingHistory(true);
    setError(null);

    try {
      const url = targetThreadId
        ? `/api/projects/${project.id}/agent?threadId=${targetThreadId}`
        : `/api/projects/${project.id}/agent`;
      const history = await fetchJson<AgentHistoryResponse>(url);
      setThreadId(history.threadId);
      setEntries(
        history.messages.length > 0 || history.toolCalls.length > 0
          ? toAgentEntries(history)
          : toLegacyMessages(project)
      );
    } catch (caught) {
      setEntries(toLegacyMessages(project));
      setError(caught instanceof Error ? caught.message : "Unable to load agent history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoadingHistory(true);
      setError(null);

      try {
        const history = await fetchJson<AgentHistoryResponse>(`/api/projects/${project.id}/agent`);

        if (cancelled) {
          return;
        }

        setThreadId(history.threadId);
        setEntries(history.messages.length > 0 || history.toolCalls.length > 0 ? toAgentEntries(history) : toLegacyMessages(project));
        await loadThreadsList();
      } catch (caught) {
        if (!cancelled) {
          setEntries(toLegacyMessages(project));
          setError(caught instanceof Error ? caught.message : "Unable to load agent history.");
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
  }, [project, loadThreadsList]);

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
    };

    setEntries((current) => sortEntries([...current, localUserMessage]));
    setDraft("");
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: threadId ?? undefined,
          message,
          models,
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
                  void loadThreadsList();
                }
              } else if (data.type === "chunk" && data.text) {
                setEntries((current) =>
                  current.map((entry) =>
                    entry.id === placeholderId && entry.kind === "message"
                      ? { ...entry, content: entry.content + data.text }
                      : entry
                  )
                );
              }
            } catch (err) {
              console.warn("Failed to parse stream packet:", rawData, err);
            }
          }
        }
      } else {
        const data = (await response.json()) as AgentPostResponse;
        setThreadId(data.threadId);
        void loadThreadsList();

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
              createdAt: new Date().toISOString(),
            });
          }

          return sortEntries(nextEntries);
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  const hasMessages = entries.length > 0;
  const editorHref = `/editor/${project.id}`;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col">
      <AssetDrawer projectId={project.id} />
      
      {/* Header section with Project hub, threads selector dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border/20 mb-6">
        <div className="flex items-center gap-4 flex-1">
          <Link href={`/projects/${project.id}`}>
            <Button variant="secondary" className="h-7 rounded-full px-2.5 text-[9px] uppercase tracking-wider font-mono">
              <PanelLeftClose className="mr-1.5 h-3 w-3" />
              Project hub
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Chat history:</span>
            <CustomSelect
              value={threadId || "new"}
              onChange={(val) => {
                if (val === "new") {
                  setThreadId(null);
                  setEntries(toLegacyMessages(project));
                } else {
                  setThreadId(val);
                  void reloadHistoryForThread(val);
                }
              }}
              options={[
                { value: "new", label: "+ New Conversation" },
                ...threads.map((t) => ({
                  value: t.id,
                  label: t.title || `Thread ${t.id.slice(0, 8)}`,
                })),
              ]}
              triggerClassName="h-7 py-1 text-[10px]"
              className="w-[180px]"
            />
          </div>
        </div>
      </div>

      {error ? <p className="pb-3 text-sm text-red-100">{error}</p> : null}

      {/* Main chat viewport */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoadingHistory ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : !hasMessages ? (
          <EmptyAgentState />
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 pb-44">
              {entries.map((entry, index) =>
                entry.kind === "message" ? (
                  <ChatMessage key={entry.id} message={entry} index={index} />
                ) : (
                  <div key={entry.id} className="flex justify-start">
                    <div className="w-full max-w-[46rem]">
                      {entry.requiresApproval ? <ApprovalCard toolCall={entry} /> : <ToolCallCard toolCall={entry} />}
                    </div>
                  </div>
                ),
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Sticky Bottom Composer - ALWAYS present to prevent layout shift */}
      <div className="pointer-events-none sticky bottom-0 mt-auto pt-6 bg-gradient-to-t from-background via-background/95 to-transparent z-40">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl">
          <AgentComposer
            value={draft}
            onChange={setDraft}
            onSubmit={() => void submitMessage()}
            isSending={isSending}
            models={models}
            onModelsChange={setModels}
            onQuickCommand={(command) => setDraft(`${command} `)}
            editorHref={editorHref}
          />
        </div>
      </div>
    </div>
  );
}
