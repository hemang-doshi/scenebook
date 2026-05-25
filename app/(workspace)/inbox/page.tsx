"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Link2, Mic, NotebookPen, Sparkles, Loader2 } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { CustomSelect } from "@/components/ui/custom-select";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { fetchJson } from "@/lib/fetcher";
import type { ContentFormat, ContentPlatform } from "@/lib/types";

const formats: ContentFormat[] = ["reel", "short", "tiktok", "carousel", "post", "vlog"];
const platforms: ContentPlatform[] = ["instagram", "youtube", "tiktok", "linkedin", "x"];

const sourceIcons = {
  link: Link2,
  reference: NotebookPen,
  text: NotebookPen,
  voice: Mic,
} as const;

export default function InboxPage() {
  const router = useRouter();
  const { data, error, isLoading, refresh } = useWorkspaceSnapshot();
  
  // Single text input for the entire capture (first line = title, remaining lines = notes)
  const [captureInput, setCaptureInput] = useState("");
  
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("short");
  const [platform, setPlatform] = useState<ContentPlatform>("youtube");
  const [isPending, startTransition] = useTransition();
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const activeItems = useMemo(
    () => data?.inboxItems.filter((item) => !item.cardId) ?? [],
    [data?.inboxItems],
  );

  if (isLoading) {
    return <Panel className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load inbox."}</Panel>;
  }

  const handleCaptureSubmit = () => {
    if (!captureInput.trim()) return;

    startTransition(async () => {
      try {
        setCaptureError(null);
        
        const lines = captureInput.trim().split("\n");
        const title = lines[0].slice(0, 100);
        const notes = lines.slice(1).join("\n");
        const sourceType = captureInput.toLowerCase().startsWith("http") ? "link" : "text";

        await fetchJson("/api/inbox", {
          method: "POST",
          body: JSON.stringify({ title, notes, sourceType }),
        });

        setCaptureInput("");
        refresh();
      } catch (err) {
        setCaptureError(err instanceof Error ? err.message : "Request failed.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Inbox"
        title="Quick Capture Hub"
        description="Jot down raw thoughts, links, and angles instantly. Convert them into projects when ready."
      />

      <div className="cmd-grid xl:grid-cols-[0.8fr_1.2fr] gap-6">
        
        {/* Left Column: Simple Capture Box */}
        <Panel className="border-border bg-surface-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div>
                <p className="cmd-label text-accent">Quick Capture</p>
                <h3 className="text-xl font-bold text-foreground mt-1">Jot down an idea</h3>
              </div>
              <Badge className="bg-accent/15 text-accent border border-accent/25">{activeItems.length} in queue</Badge>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Type your idea title on the first line, then optionally write details below it. We&apos;ll automatically structure it.
              </p>
              
              <textarea
                value={captureInput}
                onChange={(e) => setCaptureInput(e.target.value)}
                placeholder="Adjust talking-head audio gain&#10;We should test PP8 picture profile vs S-Cinetone with a warm key light."
                className="w-full min-h-[220px] bg-black/35 border border-border rounded-xl p-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                aria-label="Quick capture thought"
              />

              {captureError && (
                <p className="text-xs text-danger">{captureError}</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <Button
              disabled={isPending || !captureInput.trim()}
              onClick={handleCaptureSubmit}
              className="font-mono text-xs uppercase tracking-wider font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Capturing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> Capture Idea
                </>
              )}
            </Button>
          </div>
        </Panel>

        {/* Right Column: Queue list */}
        <Panel className="border-border bg-surface-soft">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
            <div>
              <p className="cmd-label text-accent">Live Queue</p>
              <h3 className="text-xl font-bold text-foreground mt-1">Promotion Queue</h3>
            </div>
            <Badge className="bg-zinc-800 text-muted border border-border">{activeItems.length} open</Badge>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[500px] ed-scrollbar pr-1">
            {activeItems.map((item) => {
              const Icon = sourceIcons[item.sourceType] || NotebookPen;

              return (
                <div key={item.id} className="rounded-xl border border-border bg-black/20 p-4 transition-all duration-300 hover:border-accent/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-lg border border-border bg-white/5 p-2 text-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{item.title}</p>
                        {item.notes && (
                          <p className="mt-2 text-xs leading-relaxed text-muted whitespace-pre-wrap">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-accent/10 text-accent font-mono uppercase text-[9px] border border-accent/20">
                      {item.sourceType}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      className="text-[11px] font-mono uppercase font-medium h-8 px-3"
                      onClick={() => {
                        setConvertingId(convertingId === item.id ? null : item.id);
                        setCardTitle(item.title);
                        setConvertError(null);
                      }}
                    >
                      Convert to Project
                    </Button>
                  </div>

                  {convertingId === item.id && (
                    <div className="mt-4 rounded-xl border border-border bg-black/40 p-4 space-y-4 animate-[ed-fadeIn_0.2s_ease-out]">
                      <h4 className="text-xs font-mono uppercase text-accent font-semibold">Promotion Settings</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-xs font-mono uppercase text-muted">
                          Card Title
                          <Input
                            className="mt-2 font-sans"
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                          />
                        </label>

                        <label className="block text-xs font-mono uppercase text-muted">
                          Format
                          <CustomSelect
                            value={format}
                            onChange={(val) => setFormat(val as ContentFormat)}
                            options={formats.map((f) => ({ value: f, label: f.toUpperCase() }))}
                            className="mt-2"
                          />
                        </label>

                        <label className="block text-xs font-mono uppercase text-muted">
                          Platform
                          <CustomSelect
                            value={platform}
                            onChange={(val) => setPlatform(val as ContentPlatform)}
                            options={platforms.map((p) => ({ value: p, label: p.toUpperCase() }))}
                            className="mt-2"
                          />
                        </label>

                        {convertError && (
                          <p className="col-span-full text-xs text-danger">{convertError}</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          className="h-8 px-3 text-[11px] font-mono uppercase font-medium"
                          onClick={() => {
                            setConvertingId(null);
                            setConvertError(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="h-8 px-3 text-[11px] font-mono uppercase font-medium"
                          disabled={isPending || !cardTitle.trim()}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                setConvertError(null);
                                const card = await fetchJson<{ id: string }>(
                                  `/api/inbox/${item.id}/convert`,
                                  {
                                    method: "POST",
                                    body: JSON.stringify({ title: cardTitle, format, platform }),
                                  },
                                );
                                refresh();
                                router.push(`/projects/${card.id}`);
                              } catch (err) {
                                setConvertError(err instanceof Error ? err.message : "Conversion failed.");
                              }
                            })
                          }
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Promoting...
                            </>
                          ) : (
                            "Promote to Card"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {activeItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center bg-black/5">
                <Sparkles className="h-6 w-6 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted">
                  Inbox is clear. Capture an idea in the left panel to populate your workspace.
                </p>
                <Link href="/home" className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:underline">
                  Go to Dashboard <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </Panel>

      </div>
    </div>
  );
}
