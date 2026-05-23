"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCardDetail } from "@/components/workspace/hooks";
import { statusLabels } from "@/lib/domain/content";
import { fetchJson } from "@/lib/fetcher";
import type { CardDetail } from "@/lib/data/repository";

function createChecklistItem(label: string) {
  return {
    id: crypto.randomUUID(),
    label,
    done: false,
  };
}

function syncLocalCard(
  card: CardDetail,
  patch: Partial<
    Omit<CardDetail, "scriptLab" | "shootPack" | "analyticsJournal" | "aiSuggestions">
  > & {
    scriptLab?: Partial<CardDetail["scriptLab"]>;
    shootPack?: Partial<CardDetail["shootPack"]>;
    analyticsJournal?: Partial<CardDetail["analyticsJournal"]>;
    aiSuggestions?: Partial<CardDetail["aiSuggestions"]>;
  },
): CardDetail {
  return {
    ...card,
    ...patch,
    scriptLab: patch.scriptLab ? { ...card.scriptLab, ...patch.scriptLab } : card.scriptLab,
    shootPack: patch.shootPack ? { ...card.shootPack, ...patch.shootPack } : card.shootPack,
    analyticsJournal: patch.analyticsJournal
      ? { ...card.analyticsJournal, ...patch.analyticsJournal }
      : card.analyticsJournal,
    aiSuggestions: patch.aiSuggestions
      ? { ...card.aiSuggestions, ...patch.aiSuggestions }
      : card.aiSuggestions,
  };
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const { card, error, isLoading, refresh, setCard } = useCardDetail(params.id);
  const [newARollItem, setNewARollItem] = useState("");
  const [assetTitle, setAssetTitle] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [, startTransition] = useTransition();

  const canSaveAnalytics = useMemo(
    () => Boolean(card?.analyticsJournal.followUpIdea.trim()),
    [card?.analyticsJournal.followUpIdea],
  );

  if (isLoading) {
    return <Panel>Loading content card...</Panel>;
  }

  if (error || !card) {
    return <Panel>{error ?? "Card not found."}</Panel>;
  }

  const savePatch = async (patch: Record<string, unknown>) => {
    const next = await fetchJson<CardDetail>(`/api/cards/${card.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setCard(next);
  };

  return (
    <div>
      <PageHeading
        eyebrow="Content Card"
        title={card.title}
        description="Script, shoot prep, assets, and analytics live together here before the card moves into the full studio editor."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge>{statusLabels[card.status]}</Badge>
        <Badge>{card.readiness.label}</Badge>
        <Badge>{card.platform}</Badge>
        <Badge>{card.format}</Badge>
      </div>

      <div className="cmd-grid xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Panel>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="cmd-label">Script Lab</p>
                <h2 className="cmd-title mt-3 text-3xl font-semibold">Narrative structure</h2>
              </div>
              <Link href={`/studio/${card.id}`}>
                <Button variant="secondary">Open studio editor</Button>
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-medium text-foreground">
                Hook
                <Textarea
                  aria-label="Hook"
                  className="mt-2 min-h-24"
                  value={card.scriptLab.hook}
                  onChange={(event) =>
                    setCard(syncLocalCard(card, { scriptLab: { hook: event.target.value } }))
                  }
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Script
                <Textarea
                  aria-label="Script"
                  className="mt-2 min-h-48"
                  value={card.scriptLab.script}
                  onChange={(event) =>
                    setCard(syncLocalCard(card, { scriptLab: { script: event.target.value } }))
                  }
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    startTransition(async () => {
                      await savePatch({ scriptLab: card.scriptLab });
                    })
                  }
                >
                  Save script lab
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    startTransition(async () => {
                      const next = await fetchJson<CardDetail>(`/api/cards/${card.id}/ai`, {
                        method: "POST",
                        body: JSON.stringify({ mode: "hooks" }),
                      });
                      setCard(next);
                    })
                  }
                >
                  Generate hooks
                </Button>
              </div>
            </div>
          </Panel>

          <Panel>
            <p className="cmd-label">Shoot Pack</p>
            <h2 className="cmd-title mt-3 text-3xl font-semibold">Execution checklist</h2>

            <div className="mt-6 space-y-4">
              {card.shootPack.aRoll.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm text-foreground"
                >
                  <input
                    aria-label={`Checklist ${item.label}`}
                    checked={item.done}
                    onChange={(event) =>
                      setCard(
                        syncLocalCard(card, {
                          shootPack: {
                            aRoll: card.shootPack.aRoll.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, done: event.target.checked }
                                : entry,
                            ),
                          },
                        }),
                      )
                    }
                    type="checkbox"
                  />
                  <span>{item.label}</span>
                </label>
              ))}

              <Button variant="secondary" onClick={() => setNewARollItem(" ")}>
                Add A-roll item
              </Button>

              {newARollItem !== "" ? (
                <div className="rounded-xl border border-border bg-black/20 p-4">
                  <Input
                    aria-label="New A-roll item"
                    value={newARollItem}
                    onChange={(event) => setNewARollItem(event.target.value)}
                    placeholder="Intro line at desk"
                  />
                  <div className="mt-3 flex gap-3">
                    <Button
                      onClick={() => {
                        if (!newARollItem.trim()) {
                          return;
                        }
                        setCard(
                          syncLocalCard(card, {
                            shootPack: {
                              aRoll: [
                                ...card.shootPack.aRoll,
                                createChecklistItem(newARollItem.trim()),
                              ],
                            },
                          }),
                        );
                        setNewARollItem("");
                      }}
                    >
                      Save A-roll item
                    </Button>
                    <Button variant="ghost" onClick={() => setNewARollItem("")}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <Button
                onClick={() =>
                  startTransition(async () => {
                    await savePatch({ shootPack: card.shootPack });
                    refresh();
                  })
                }
              >
                Save shoot pack
              </Button>
            </div>
          </Panel>

          <Panel>
            <p className="cmd-label">Analytics Journal</p>
            <h2 className="cmd-title mt-3 text-3xl font-semibold">Post-publish learning</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-foreground">
                Views
                <Input
                  aria-label="Views"
                  className="mt-2"
                  type="number"
                  value={card.analyticsJournal.views}
                  onChange={(event) =>
                    setCard(
                      syncLocalCard(card, {
                        analyticsJournal: { views: Number(event.target.value) },
                      }),
                    )
                  }
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Likes
                <Input
                  aria-label="Likes"
                  className="mt-2"
                  type="number"
                  value={card.analyticsJournal.likes}
                  onChange={(event) =>
                    setCard(
                      syncLocalCard(card, {
                        analyticsJournal: { likes: Number(event.target.value) },
                      }),
                    )
                  }
                />
              </label>

              <label className="text-sm font-medium text-foreground md:col-span-2">
                Decision
                <Select
                  aria-label="Decision"
                  className="mt-2"
                  value={card.analyticsJournal.decision}
                  onChange={(event) =>
                    setCard(
                      syncLocalCard(card, {
                        analyticsJournal: {
                          decision: event.target.value as CardDetail["analyticsJournal"]["decision"],
                        },
                      }),
                    )
                  }
                >
                  <option value="repeat">Repeat</option>
                  <option value="remix">Remix</option>
                  <option value="retire">Retire</option>
                </Select>
              </label>

              <label className="text-sm font-medium text-foreground md:col-span-2">
                Follow-up idea
                <Textarea
                  aria-label="Follow-up idea"
                  className="mt-2"
                  value={card.analyticsJournal.followUpIdea}
                  onChange={(event) =>
                    setCard(
                      syncLocalCard(card, {
                        analyticsJournal: { followUpIdea: event.target.value },
                      }),
                    )
                  }
                />
              </label>

              <div className="md:col-span-2">
                <Button
                  disabled={!canSaveAnalytics}
                  onClick={() =>
                    startTransition(async () => {
                      await savePatch({
                        status: "analyzed",
                        analyticsJournal: card.analyticsJournal,
                      });
                    })
                  }
                >
                  Save analytics
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <p className="cmd-label">AI Suggestions</p>
            <div className="mt-4 space-y-3">
              {card.aiSuggestions.hooks.map((suggestion) => (
                <div
                  key={suggestion}
                  className="rounded-xl border border-border bg-black/20 p-4 text-sm leading-6 text-foreground"
                >
                  {suggestion}
                </div>
              ))}

              {card.aiSuggestions.hooks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4">
                  <p className="text-sm leading-6 text-muted">
                    Generate hooks, captions, or next angles without overwriting the working draft.
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="cmd-label">Asset Library</p>
                <h2 className="cmd-title mt-3 text-3xl font-semibold">References and media</h2>
              </div>
              <Link href={`/studio/${card.id}`}>
                <Button variant="ghost">
                  Launch editor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              <label className="text-sm font-medium text-foreground">
                Asset title
                <Input
                  aria-label="Asset title"
                  className="mt-2"
                  value={assetTitle}
                  onChange={(event) => setAssetTitle(event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-foreground">
                Asset URL
                <Input
                  aria-label="Asset URL"
                  className="mt-2"
                  value={assetUrl}
                  onChange={(event) => setAssetUrl(event.target.value)}
                />
              </label>

              <Button
                onClick={() =>
                  startTransition(async () => {
                    const next = await fetchJson<CardDetail>(`/api/cards/${card.id}/assets`, {
                      method: "POST",
                      body: JSON.stringify({
                        title: assetTitle,
                        url: assetUrl,
                        type: "link",
                      }),
                    });
                    setCard(next);
                    setAssetTitle("");
                    setAssetUrl("");
                  })
                }
              >
                Attach asset
              </Button>

              <div className="space-y-3">
                {card.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-xl border border-border bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{asset.title}</p>
                      <Badge>{asset.type}</Badge>
                    </div>
                    <p className="mt-2 break-all text-sm text-muted">{asset.url}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="cmd-glow">
            <p className="cmd-label">Readiness</p>
            <p className="mt-3 text-4xl font-semibold text-foreground">
              {card.readiness.score}%
            </p>
            <p className="mt-2 text-sm text-muted">{card.readiness.label}</p>
            <div className="mt-4 space-y-2">
              {card.readiness.missing.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-muted">
                  <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
