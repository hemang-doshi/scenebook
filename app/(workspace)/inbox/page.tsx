"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { PageHeading } from "@/components/page-heading";
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
        title="Capture before the idea cools off"
        description="Every raw thought, reference, and angle lands here first. Then you promote it into a card when the shape is clear."
      />

      <div className="section-grid lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <h2 className="editorial-heading text-3xl">New capture</h2>
          <div className="mt-5 space-y-4">
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
                className="mt-2"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Why this matters, the mood, the hook, or the visual."
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
          <h2 className="editorial-heading text-3xl">Live queue</h2>
          <div className="mt-5 space-y-4">
            {activeItems.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-border bg-white/55 p-4">
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.notes}</p>
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
                  <div className="mt-4 grid gap-3 rounded-[20px] border border-border bg-white/70 p-4 md:grid-cols-2">
                    <label className="text-sm font-medium">
                      Card title
                      <Input
                        aria-label="Card title"
                        className="mt-2"
                        value={cardTitle}
                        onChange={(event) => setCardTitle(event.target.value)}
                      />
                    </label>
                    <label className="text-sm font-medium">
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
                    <label className="text-sm font-medium">
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
            ))}
            {activeItems.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Inbox is clear. Capture the next spark as soon as it shows up.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
