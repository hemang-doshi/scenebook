"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCardDetail } from "@/components/workspace/hooks";
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
        eyebrow="Card detail"
        title={card.title}
        description="The production room for one content idea: script, shoot prep, assets, analytics, and next-step learning."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Badge>{card.status.replaceAll("_", " ")}</Badge>
        <Badge>{card.readiness.label}</Badge>
        <Link href="/board">
          <Button variant="secondary">Return to production board</Button>
        </Link>
      </div>

      <div className="section-grid xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Panel>
            <h2 className="editorial-heading text-3xl">Script lab</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-medium">
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
              <label className="text-sm font-medium">
                Script
                <Textarea
                  aria-label="Script"
                  className="mt-2 min-h-40"
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
            <h2 className="editorial-heading text-3xl">Shoot pack</h2>
            <div className="mt-5 space-y-4">
              {card.shootPack.aRoll.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-[20px] border border-border bg-white/60 px-4 py-3 text-sm"
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
                <div className="rounded-[22px] border border-border bg-white/65 p-4">
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
            <h2 className="editorial-heading text-3xl">Analytics journal</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
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
              <label className="text-sm font-medium">
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
              <label className="text-sm font-medium md:col-span-2">
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
              <label className="text-sm font-medium md:col-span-2">
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
            <h2 className="editorial-heading text-3xl">AI suggestions</h2>
            <div className="mt-5 space-y-3">
              {card.aiSuggestions.hooks.map((suggestion) => (
                <div
                  key={suggestion}
                  className="rounded-[20px] border border-border bg-white/60 p-4 text-sm leading-6"
                >
                  {suggestion}
                </div>
              ))}
              {card.aiSuggestions.hooks.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Generate hooks, captions, or follow-up ideas without overwriting the
                  creator draft.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <h2 className="editorial-heading text-3xl">Asset library</h2>
            <div className="mt-5 space-y-4">
              <label className="text-sm font-medium">
                Asset title
                <Input
                  aria-label="Asset title"
                  className="mt-2"
                  value={assetTitle}
                  onChange={(event) => setAssetTitle(event.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
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
                    className="rounded-[20px] border border-border bg-white/60 p-4"
                  >
                    <p className="text-sm font-semibold">{asset.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{asset.url}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
