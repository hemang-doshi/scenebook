"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { statusLabels } from "@/lib/domain/content";
import { fetchJson } from "@/lib/fetcher";
import type { ContentFormat, ContentPlatform, ContentStatus } from "@/lib/types";

const boardStatuses: ContentStatus[] = [
  "idea",
  "scripted",
  "ready_to_shoot",
  "shot",
  "editing",
  "posted",
  "analyzed",
  "archived",
];

export default function BoardPage() {
  const { data, error, isLoading, refresh } = useWorkspaceSnapshot();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const cards = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.cards.filter((card) => {
      const matchesPlatform =
        platformFilter === "all" || card.platform === (platformFilter as ContentPlatform);
      const matchesFormat =
        formatFilter === "all" || card.format === (formatFilter as ContentFormat);
      return matchesPlatform && matchesFormat;
    });
  }, [data, formatFilter, platformFilter]);

  if (isLoading) {
    return <Panel>Loading production board...</Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load board."}</Panel>;
  }

  return (
    <div>
      <PageHeading
        eyebrow="Board"
        title="Production Board"
        description="A dense status surface for the full content lifecycle: planning, shooting, editing, publishing, and reflection."
      />

      <Panel className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
          <option value="all">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
          <option value="linkedin">LinkedIn</option>
          <option value="x">X</option>
        </Select>

        <Select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}>
          <option value="all">All formats</option>
          <option value="reel">Reel</option>
          <option value="short">Short</option>
          <option value="tiktok">TikTok</option>
          <option value="carousel">Carousel</option>
          <option value="post">Post</option>
          <option value="vlog">Vlog</option>
        </Select>

        <Link href="/inbox">
          <Button>Capture another idea</Button>
        </Link>
      </Panel>

      <div className="grid gap-4 overflow-x-auto xl:grid-cols-4 2xl:grid-cols-8">
        {boardStatuses.map((status) => {
          const statusCards = cards.filter((card) => card.status === status);

          return (
            <div key={status} className="min-w-[270px] rounded-xl border border-border bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="cmd-label">{statusLabels[status]}</p>
                <Badge>{statusCards.length}</Badge>
              </div>

              <div className="mt-4 space-y-4">
                {statusCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-xl border border-border bg-black/20 p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {card.platform} · {card.format}
                    </p>
                    <p className="mt-3 text-sm text-muted">
                      {card.readiness.label} · {card.readiness.score}%
                    </p>

                    <Select
                      className="mt-4"
                      data-testid={`card-status-select-${card.id}`}
                      value={card.status}
                      onChange={(event) =>
                        startTransition(async () => {
                          await fetchJson(`/api/cards/${card.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: event.target.value }),
                          });
                          refresh();
                        })
                      }
                    >
                      {boardStatuses.map((nextStatus) => (
                        <option key={nextStatus} value={nextStatus}>
                          {statusLabels[nextStatus]}
                        </option>
                      ))}
                    </Select>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={`/cards/${card.id}`}>
                        <Button variant="secondary">Content card</Button>
                      </Link>
                      <Link href={`/studio/${card.id}`}>
                        <Button variant="ghost">Studio</Button>
                      </Link>
                    </div>

                    {isPending ? (
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        Saving
                      </p>
                    ) : null}
                  </div>
                ))}

                {statusCards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4">
                    <p className="text-sm leading-6 text-muted">No cards here yet.</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
