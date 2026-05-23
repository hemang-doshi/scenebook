"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PageHeading } from "@/components/page-heading";
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
        title="Production board"
        description="A lightweight creator-native board that shows the content lifecycle without turning into a corporate project manager."
      />

      <Panel className="mb-5 flex flex-wrap gap-3">
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

      <div className="grid gap-4 overflow-x-auto lg:grid-cols-4 2xl:grid-cols-8">
        {boardStatuses.map((status) => {
          const statusCards = cards.filter((card) => card.status === status);

          return (
            <Panel key={status} className="min-h-[320px] min-w-[250px]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {statusLabels[status]}
              </p>
              <div className="mt-4 space-y-4">
                {statusCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-[24px] border border-border bg-white/70 p-4"
                  >
                    <p className="text-sm font-semibold">{card.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {card.platform} · {card.format}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {card.readiness.label} ({card.readiness.score}%)
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
                    <div className="mt-4 flex items-center gap-3">
                      <Link href={`/cards/${card.id}`}>Card detail</Link>
                      {isPending ? (
                        <span className="text-xs text-muted-foreground">Saving...</span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {statusCards.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    No cards here yet.
                  </p>
                ) : null}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
