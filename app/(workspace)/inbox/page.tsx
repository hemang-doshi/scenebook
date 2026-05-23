"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Link2, Mic, NotebookPen } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceType, setSourceType] = useState("text");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("short");
  const [platform, setPlatform] = useState<ContentPlatform>("youtube");
  const [isPending, startTransition] = useTransition();

  const activeItems = useMemo(
    () => data?.inboxItems.filter((item) => !item.cardId) ?? [],
    [data?.inboxItems],
  );

  if (isLoading) {
    return <Panel>Loading inbox...</Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load inbox."}</Panel>;
  }

  return (
    <div>
      <PageHeading
        eyebrow="Inbox"
        title="Capture before the idea cools"
        description="Every reference, note, and half-formed angle lands here first. Promote it when the format and platform are clear."
      />

      <div className="cmd-grid xl:grid-cols-[0.72fr_1.28fr]">
        <Panel>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="cmd-label">New Capture</p>
              <h2 className="cmd-title mt-3 text-3xl font-semibold">Ingest a fresh idea</h2>
            </div>
            <Badge>{activeItems.length} queued</Badge>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Idea title
              <Input
                aria-label="Idea title"
                className="mt-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="The tiny setup fix I wish I filmed months ago"
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Source type
              <Select
                className="mt-2"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
              >
                <option value="text">Text note</option>
                <option value="link">Link</option>
                <option value="reference">Reference</option>
                <option value="voice">Voice placeholder</option>
              </Select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Notes
              <Textarea
                aria-label="Notes"
                className="mt-2 min-h-40"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Hook, visual, why it matters, what should be tested."
              />
            </label>

            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await fetchJson("/api/inbox", {
                    method: "POST",
                    body: JSON.stringify({ title, notes, sourceType }),
                  });
                  setTitle("");
                  setNotes("");
                  refresh();
                })
              }
            >
              Capture idea
            </Button>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="cmd-label">Live Queue</p>
              <h2 className="cmd-title mt-3 text-3xl font-semibold">Promotion candidates</h2>
            </div>
            <Badge>{activeItems.length} open</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {activeItems.map((item) => {
              const Icon = sourceIcons[item.sourceType];

              return (
                <div key={item.id} className="rounded-xl border border-border bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-lg border border-border bg-white/5 p-2 text-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted">{item.notes}</p>
                      </div>
                    </div>
                    <Badge>{item.sourceType}</Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setConvertingId(item.id);
                        setCardTitle(item.title);
                      }}
                    >
                      Convert to card
                    </Button>
                  </div>

                  {convertingId === item.id ? (
                    <div className="mt-4 cmd-grid rounded-xl border border-border bg-black/30 p-4 md:grid-cols-2">
                      <label className="text-sm font-medium text-foreground">
                        Card title
                        <Input
                          aria-label="Card title"
                          className="mt-2"
                          value={cardTitle}
                          onChange={(event) => setCardTitle(event.target.value)}
                        />
                      </label>

                      <label className="text-sm font-medium text-foreground">
                        Format
                        <Select
                          aria-label="Format"
                          className="mt-2"
                          value={format}
                          onChange={(event) => setFormat(event.target.value as ContentFormat)}
                        >
                          {formats.map((entry) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="text-sm font-medium text-foreground">
                        Platform
                        <Select
                          aria-label="Platform"
                          className="mt-2"
                          value={platform}
                          onChange={(event) =>
                            setPlatform(event.target.value as ContentPlatform)
                          }
                        >
                          {platforms.map((entry) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </Select>
                      </label>

                      <div className="flex items-end gap-3">
                        <Button
                          onClick={() =>
                            startTransition(async () => {
                              const card = await fetchJson<{ id: string }>(
                                `/api/inbox/${item.id}/convert`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ title: cardTitle, format, platform }),
                                },
                              );
                              refresh();
                              router.push(`/cards/${card.id}`);
                            })
                          }
                        >
                          Create content card
                        </Button>
                        <Button variant="ghost" onClick={() => setConvertingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {activeItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6">
                <p className="text-sm leading-6 text-muted">
                  Inbox is clear. The next idea gets first-class treatment as soon as it lands.
                </p>
                <LinkRow href="/home" label="Return to dashboard" />
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition hover:text-accent"
      href={href}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
