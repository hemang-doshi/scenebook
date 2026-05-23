"use client";

import Link from "next/link";
import { ArrowRight, Film, Inbox, Sparkles } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { statusLabels } from "@/lib/domain/content";

export default function HomePage() {
  const { data, error, isLoading } = useWorkspaceSnapshot();

  if (isLoading) {
    return <Panel>Loading your studio...</Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load your workspace."}</Panel>;
  }

  const latestCard = data.cards[0];
  const editingCards = data.cards.filter((card) => card.status === "editing").slice(0, 3);
  const reviewCards = data.cards.filter((card) => card.status === "posted").slice(0, 3);

  return (
    <div>
      <PageHeading
        eyebrow="Dashboard"
        title="Cinematic OS"
        description="A command surface for the next idea, the next production move, and the next learning loop."
      />

      <div className="cmd-grid lg:grid-cols-3">
        <Panel>
          <div className="flex items-center justify-between">
            <Badge>Inbox</Badge>
            <Inbox className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-5 text-5xl font-semibold text-foreground">{data.stats.inbox}</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Raw captures waiting for structure and a production decision.
          </p>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <Badge>Ready to Shoot</Badge>
            <Film className="h-4 w-4 text-muted" />
          </div>
          <p className="mt-5 text-5xl font-semibold text-foreground">{data.stats.readyToShoot}</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Cards with script, checklist, and asset coverage lined up.
          </p>
        </Panel>

        <Panel className="cmd-glow">
          <div className="flex items-center justify-between">
            <Badge>Reflection Queue</Badge>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-5 text-5xl font-semibold text-foreground">
            {data.stats.postedAwaitingAnalysis}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Published work still waiting for notes, learning, and the next experiment.
          </p>
        </Panel>
      </div>

      <div className="mt-6 cmd-grid xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="cmd-label">Current Focus</p>
              <h2 className="cmd-title mt-3 text-3xl font-semibold">Now editing</h2>
            </div>
            <Link href="/board">
              <Button variant="secondary">Open board</Button>
            </Link>
          </div>

          {latestCard ? (
            <div className="mt-5 rounded-xl border border-border bg-black/20 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{statusLabels[latestCard.status]}</Badge>
                <Badge>{latestCard.platform}</Badge>
                <Badge>{latestCard.format}</Badge>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-foreground">{latestCard.title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                Readiness {latestCard.readiness.score}% · {latestCard.readiness.label}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/cards/${latestCard.id}`}>
                  <Button>Open content card</Button>
                </Link>
                <Link href={`/studio/${latestCard.id}`}>
                  <Button variant="secondary">Launch studio editor</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border p-5">
              <p className="text-sm leading-6 text-muted">
                No active cards yet. Capture one idea and the studio will route the next move.
              </p>
              <Link className="mt-4 inline-flex" href="/inbox">
                <Button>Capture idea</Button>
              </Link>
            </div>
          )}
        </Panel>

        <Panel>
          <p className="cmd-label">Pipeline Watch</p>
          <div className="mt-4 space-y-4">
            {(editingCards.length ? editingCards : reviewCards).map((card) => (
              <Link
                key={card.id}
                href={card.status === "editing" ? `/studio/${card.id}` : `/cards/${card.id}`}
                className="block rounded-xl border border-border bg-black/20 p-4 transition hover:border-white/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {statusLabels[card.status]} · {card.platform}
                </p>
              </Link>
            ))}

            {editingCards.length === 0 && reviewCards.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                Cards in flight will show up here with a direct jump into the right surface.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
