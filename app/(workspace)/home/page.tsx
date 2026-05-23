"use client";

import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";

export default function HomePage() {
  const { data, error, isLoading } = useWorkspaceSnapshot();

  if (isLoading) {
    return <Panel>Loading your studio...</Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load your workspace."}</Panel>;
  }

  const latestCard = data.cards[0];

  return (
    <div>
      <PageHeading
        eyebrow="Home"
        title="Your creative system"
        description="A calm control room for the next idea, the next shoot, and the next lesson."
      />

      <div className="section-grid lg:grid-cols-3">
        <Panel>
          <Badge>Inbox</Badge>
          <p className="mt-4 text-4xl font-semibold">{data.stats.inbox}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            raw ideas waiting to become structured content cards
          </p>
        </Panel>
        <Panel>
          <Badge>Ready to Shoot</Badge>
          <p className="mt-4 text-4xl font-semibold">{data.stats.readyToShoot}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            cards with enough structure to prep a filming session
          </p>
        </Panel>
        <Panel>
          <Badge>Needs Reflection</Badge>
          <p className="mt-4 text-4xl font-semibold">
            {data.stats.postedAwaitingAnalysis}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            posted pieces that still need learnings and follow-up ideas
          </p>
        </Panel>
      </div>

      <div className="mt-5 section-grid lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <h2 className="editorial-heading text-3xl">Next up</h2>
          {latestCard ? (
            <div className="mt-5 rounded-[26px] border border-border bg-white/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {latestCard.status.replaceAll("_", " ")}
              </p>
              <h3 className="mt-3 text-2xl font-semibold">{latestCard.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Readiness: {latestCard.readiness.label} ({latestCard.readiness.score}%)
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/cards/${latestCard.id}`}>
                  <Button>Continue card</Button>
                </Link>
                <Link href="/board">
                  <Button variant="secondary">Open production board</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[26px] border border-dashed border-border bg-white/55 p-5">
              <p className="text-sm text-muted-foreground">
                No active cards yet. Capture one idea and the whole studio will wake up.
              </p>
              <Link className="mt-4 inline-flex" href="/inbox">
                <Button>Capture idea</Button>
              </Link>
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="editorial-heading text-3xl">Recent learnings</h2>
          <div className="mt-5 space-y-4">
            {data.cards
              .filter((card) => card.analyticsJournal.reflection.trim())
              .slice(0, 3)
              .map((card) => (
                <div
                  key={card.id}
                  className="rounded-[24px] border border-border bg-white/55 p-4"
                >
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {card.analyticsJournal.reflection}
                  </p>
                </div>
              ))}
            {!data.cards.some((card) => card.analyticsJournal.reflection.trim()) ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Your first reflection will show up here once a card reaches the analytics
                journal.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
