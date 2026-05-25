/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  Film,
  Inbox,
  Sparkles,
  Send,
  Loader2,
  BookmarkPlus,
  PlusCircle,
  Bell,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CustomSelect } from "@/components/ui/custom-select";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { CreatorProgress } from "@/components/workspace/creator-progress";
import { statusLabels } from "@/lib/domain/content";
import { fetchJson } from "@/lib/fetcher";

const models = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Fast)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Creative)" },
  { id: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B (Analytical)" },
];

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function HomePage() {
  const router = useRouter();
  const { data, error, isLoading, refresh } = useWorkspaceSnapshot();
  const [isPending, startTransition] = useTransition();

  // Quick AI Assistant States
  const [model, setModel] = useState("gemini-2.5-flash");
  const [prompt, setPrompt] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetCardId, setTargetCardId] = useState("");
  const [linkingIndex, setLinkingIndex] = useState<number | null>(null);
  const [capturingIndex, setCapturingIndex] = useState<number | null>(null);

  // Load first card as default target card
  useEffect(() => {
    if (data?.cards && data.cards.length > 0 && !targetCardId) {
      setTargetCardId(data.cards[0].id);
    }
  }, [data, targetCardId]);

  if (isLoading) {
    return <Panel className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load your workspace."}</Panel>;
  }

  const latestCard = data.cards[0];
  const activeProjectsCount = data.cards.filter((card) => card.status !== "posted" && card.status !== "analyzed").length;

  const handleSendPrompt = async () => {
    if (!prompt.trim() || isGenerating) return;

    const userMsg = prompt;
    setPrompt("");
    setChatLog((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsGenerating(true);

    try {
      const res = await fetchJson<{ text: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          prompt: userMsg,
          systemInstruction: "You are a creative brainstorming assistant for content creators. Help them refine Hooks, Script Beats, outlines, or ideas. Keep responses structured and punchy.",
          modelOverride: model,
        }),
      });

      setChatLog((prev) => [...prev, { role: "ai", content: res.text }]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        { role: "ai", content: "Error: Failed to connect to AI engine. Please configure keys in Settings." },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLinkToCard = async (msgIndex: number, text: string) => {
    if (!targetCardId) return;
    setLinkingIndex(msgIndex);
    try {
      await fetchJson(`/api/cards/${targetCardId}/assets`, {
        method: "POST",
        body: JSON.stringify({
          title: `Playground Idea (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          url: "text-overlay-placeholder",
          type: "document",
          note: text,
        }),
      });
      alert("Successfully linked suggestion as a card asset!");
      refresh();
    } catch (err) {
      alert("Failed to link suggestion: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLinkingIndex(null);
    }
  };

  const handleCaptureAsInbox = async (msgIndex: number, text: string) => {
    setCapturingIndex(msgIndex);
    try {
      await fetchJson("/api/inbox", {
        method: "POST",
        body: JSON.stringify({
          title: text.split("\n")[0].slice(0, 50) || "AI Captured Idea",
          notes: text,
          sourceType: "text",
        }),
      });
      alert("Successfully captured to Inbox!");
      refresh();
    } catch (err) {
      alert("Failed to capture idea: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setCapturingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          eyebrow="Command Center"
          title="Creator Dashboard"
          description="Track your video workflow, capture raw content concepts, and enhance scripts with AI."
        />
        <div className="flex items-center gap-2">
          <Link href="/inbox">
            <Button className="font-mono text-xs uppercase tracking-wider">
              <PlusCircle className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        </div>
      </div>

      {latestCard && (
        <div className="w-full">
          <CreatorProgress currentStatus={latestCard.status} cardId={latestCard.id} />
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="cmd-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Panel className="border-border/60 bg-black/10">
          <div className="flex items-center justify-between">
            <Badge className="bg-accent/10 text-accent border-accent/20">Inbox</Badge>
            <Inbox className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground">{data.stats.inbox}</p>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Raw ideas pending status or project alignment.
          </p>
        </Panel>

        <Panel className="border-border/60 bg-black/10">
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active Projects</Badge>
            <Film className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground">{activeProjectsCount}</p>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Content cards currently moving in the pipeline.
          </p>
        </Panel>

        <Panel className="border-border/60 bg-black/10">
          <div className="flex items-center justify-between">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Ready to Shoot</Badge>
            <Sparkles className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground">{data.stats.readyToShoot}</p>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Scripts fully detailed, shotlist beat checklist set up.
          </p>
        </Panel>

        <Panel className="border-border/60 bg-black/10">
          <div className="flex items-center justify-between">
            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Reflection Queue</Badge>
            <Bell className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            {data.stats.postedAwaitingAnalysis}
          </p>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Videos posted needing performance journal reviews.
          </p>
        </Panel>
      </div>

      {/* Main Content Area */}
      <div className="cmd-grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        
        {/* Left Column: Quick AI Assistant & Pick up where you left off */}
        <div className="space-y-6">
          
          {/* Pick Up Where You Left Off */}
          {latestCard && (
            <Panel className="cmd-glow border-accent/20 bg-accent/[0.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cmd-label text-accent">Active Project</p>
                  <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">Pick up where you left off</h3>
                </div>
                <Badge className="bg-accent text-accent-foreground">{statusLabels[latestCard.status]}</Badge>
              </div>

              <div className="mt-4 rounded-lg border border-border/40 bg-black/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">{latestCard.title}</h4>
                    <p className="mt-1 text-xs text-muted">
                      {latestCard.platform.toUpperCase()} · {latestCard.format.toUpperCase()} · Readiness: {latestCard.readiness.score}% ({latestCard.readiness.label})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/cards/${latestCard.id}`}>
                      <Button variant="secondary" className="text-xs h-8 px-3">Docs & Tasks</Button>
                    </Link>
                    <Link href={`/studio/${latestCard.id}`}>
                      <Button className="text-xs h-8 px-3">Launch Studio</Button>
                    </Link>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="mt-4 h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${latestCard.readiness.score}%` }}
                  />
                </div>
              </div>
            </Panel>
          )}

          {/* Quick AI Assistant Panel */}
          <Panel className="border-border bg-surface-soft flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <p className="cmd-label text-accent">Brainstorming Assistant</p>
                <h3 className="text-lg font-bold text-foreground mt-1">Quick AI Assistant</h3>
              </div>
              <CustomSelect
                value={model}
                onChange={setModel}
                options={models.map((m) => ({ value: m.id, label: m.label }))}
                className="w-[180px]"
                align="right"
              />
            </div>

            {/* Chat Messages */}
            <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto ed-scrollbar space-y-4 mb-4 p-2 bg-black/10 rounded-lg">
              {chatLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Sparkles className="h-6 w-6 text-muted mb-2 animate-pulse" />
                  <p className="text-xs text-muted leading-relaxed">
                    Need quick inspiration? Ask for a hook, an outline, or a title suggestion.<br/>
                    Generated results can be linked directly to your active card assets.
                  </p>
                </div>
              ) : (
                chatLog.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] font-mono text-muted mb-1">
                      {msg.role === "user" ? "CREATOR" : "AI"}
                    </span>
                    <div className={`text-xs p-3 rounded-lg max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-accent/15 text-foreground border border-accent/20" 
                        : "bg-surface-contrast text-foreground border border-border"
                    }`}>
                      {msg.content}
                    </div>

                    {msg.role === "ai" && !msg.content.startsWith("Error:") && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {data.cards.length > 0 && (
                          <div className="flex items-center gap-1.5 bg-black/30 rounded border border-border p-1">
                            <CustomSelect
                              value={targetCardId}
                              onChange={setTargetCardId}
                              options={data.cards.map((c) => ({ value: c.id, label: c.title }))}
                              className="w-[140px]"
                              triggerClassName="bg-transparent border-0 h-6 px-1 hover:border-0 hover:bg-white/5 py-0"
                              dropdownClassName="w-[180px]"
                            />
                            <button
                              disabled={linkingIndex !== null}
                              onClick={() => handleLinkToCard(i, msg.content)}
                              className="text-[10px] font-mono text-accent hover:text-accent-secondary uppercase flex items-center gap-1 cursor-pointer"
                            >
                              {linkingIndex === i ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <BookmarkPlus className="h-2.5 w-2.5" />
                              )}
                              Link
                            </button>
                          </div>
                        )}
                        <button
                          disabled={capturingIndex !== null}
                          onClick={() => handleCaptureAsInbox(i, msg.content)}
                          className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase flex items-center gap-1 cursor-pointer bg-black/30 px-2 py-1 rounded border border-border"
                        >
                          {capturingIndex === i ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Inbox className="h-2.5 w-2.5" />
                          )}
                          Capture Idea
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-accent">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating suggestions...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
                placeholder="Ask assistant (e.g. 'Give me 3 cinematic hooks for camera setup')"
                className="flex-1 bg-black/30 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Button className="w-10 px-0 h-10" onClick={handleSendPrompt} disabled={isGenerating || !prompt.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Panel>

        </div>

        {/* Right Column: Pipeline Watch & Notifications */}
        <div className="space-y-6">
          
          {/* Pipeline Watch */}
          <Panel className="border-border">
            <p className="cmd-label mb-4">Pipeline Watch</p>
            <div className="space-y-4">
              {data.cards.slice(0, 5).map((card) => (
                <div
                  key={card.id}
                  className="rounded-xl border border-border bg-black/15 p-4 flex items-center justify-between gap-4 transition hover:border-accent/40"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                      {statusLabels[card.status]} · {card.platform.toUpperCase()}
                    </p>
                  </div>
                  <Link href={`/cards/${card.id}`}>
                    <button className="p-2 bg-white/5 hover:bg-accent/10 border border-border rounded-lg text-muted hover:text-accent transition cursor-pointer">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              ))}

              {data.cards.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">
                  No active projects. Start by creating a project card from the sidebar!
                </p>
              ) : null}
            </div>
          </Panel>

          {/* Quick Action Suggestion Panel */}
          <Panel className="border-border bg-surface-muted/40">
            <p className="cmd-label mb-3">Suggested Workflows</p>
            <ul className="space-y-2 text-xs">
              <li className="p-3 bg-black/25 rounded border border-border flex items-center justify-between">
                <span>Configure custom AI API Keys</span>
                <Link href="/settings" className="text-accent hover:underline font-mono">Setup</Link>
              </li>
              <li className="p-3 bg-black/25 rounded border border-border flex items-center justify-between">
                <span>Playground and Model Testing</span>
                <Link href="/playground" className="text-accent hover:underline font-mono">Launch</Link>
              </li>
              <li className="p-3 bg-black/25 rounded border border-border flex items-center justify-between">
                <span>Rethink board workflows</span>
                <Link href="/board" className="text-accent hover:underline font-mono">View Board</Link>
              </li>
            </ul>
          </Panel>

        </div>

      </div>
    </div>
  );
}
