"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MessageSquare, PanelLeftClose, Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { textModelPresets } from "@/lib/ai/model-registry";

export function ProjectChatPanel({
  project,
  onRefresh,
}: {
  project: ProjectWorkspace;
  onRefresh: () => void;
}) {
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatModel, setChatModel] = useState<string>(textModelPresets[0].id);
  const [isSending, setIsSending] = useState(false);

  async function handleProjectChat() {
    if (!chatPrompt.trim()) return;

    setIsSending(true);
    try {
      await fetchJson(`/api/projects/${project.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ prompt: chatPrompt, model: chatModel }),
      });
      setChatPrompt("");
      onRefresh();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <Badge className="border-accent/20 bg-accent/10 text-accent">
            {statusLabels[project.status]}
          </Badge>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.title}</h1>
            <p className="mt-1 text-sm text-muted">
              Focus on the conversation. Assets, analytics, and setup stay one step away in the project hub.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}`}>
            <Button variant="secondary" className="h-9 px-3 text-[10px]">
              <PanelLeftClose data-icon="inline-start" className="h-3.5 w-3.5" />
              Project hub
            </Button>
          </Link>
          <Link href={`/editor/${project.id}`}>
            <Button className="h-9 px-3 text-[10px]">
              <Sparkles data-icon="inline-start" className="h-3.5 w-3.5" />
              Open editor
            </Button>
          </Link>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-2">
        <div className="flex min-h-full flex-col gap-5 pb-40">
          {project.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
            >
              <div className="cmd-panel-soft w-full max-w-2xl rounded-[2rem] border border-accent/15 px-8 py-12">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
                  Shape the next scene here
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
                  Use this thread for hooks, beat changes, transitions, and tighter phrasing. The workspace stays out of the way until you need it.
                </p>
              </div>
            </motion.div>
          ) : (
            project.messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
                  className={isUser ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={[
                      "max-w-[min(46rem,88%)] rounded-[1.75rem] border px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
                      isUser
                        ? "border-accent/25 bg-accent/12 text-foreground"
                        : "border-border/70 bg-black/25 text-foreground",
                    ].join(" ")}
                  >
                    <p className="cmd-label mb-3 text-[10px] text-muted">
                      {isUser ? "You" : message.role === "assistant" ? "SceneBook" : "System"}
                    </p>
                    <p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="pointer-events-none sticky bottom-0 mt-auto pt-6">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-[2rem] border border-border/80 bg-background/88 p-3 shadow-[0_32px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3">
            <Textarea
              value={chatPrompt}
              onChange={(event) => setChatPrompt(event.target.value)}
              placeholder="Ask for the next beat, a sharper cold open, a better transition, or a rewrite."
              className="min-h-24 resize-none rounded-[1.5rem] border-0 bg-transparent px-4 py-3 text-base leading-7 shadow-none focus-visible:ring-0"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-[190px]">
                  <CustomSelect
                    value={chatModel}
                    onChange={setChatModel}
                    options={textModelPresets.map((model) => ({ value: model.id, label: model.label }))}
                    triggerClassName="h-10 rounded-full border-border/70 bg-black/25 px-4 text-[11px]"
                    dropdownClassName="rounded-2xl"
                  />
                </div>
                <p className="text-xs text-muted">
                  {project.messages.length} saved turns
                </p>
              </div>
              <Button
                disabled={isSending || !chatPrompt.trim()}
                onClick={handleProjectChat}
                className="h-11 rounded-full px-5 text-[10px]"
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
