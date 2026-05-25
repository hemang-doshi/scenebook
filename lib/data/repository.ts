import { generateText } from "@/lib/ai/client";
import { buildAssistPrompt } from "@/lib/ai/prompts";
import { getCardReadiness } from "@/lib/domain/content";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { mapCardRow } from "@/lib/data/mappers";
import type {
  AISuggestions,
  AnalyticsJournal,
  CardAsset,
  ContentCard,
  ContentFormat,
  ContentPlatform,
  ContentStatus,
  InboxItem,
  ScriptLab,
  ShootPack,
} from "@/lib/types";

type WorkspaceSnapshot = {
  sampleMode: boolean;
  inboxItems: InboxItem[];
  cards: Array<
    ContentCard & {
      assets: CardAsset[];
      readiness: ReturnType<typeof getCardReadiness>;
    }
  >;
  stats: {
    inbox: number;
    readyToShoot: number;
    postedAwaitingAnalysis: number;
  };
};

type CardDetail = WorkspaceSnapshot["cards"][number];

type CardPatch = Partial<
  Pick<
    ContentCard,
    "title" | "status" | "format" | "platform" | "topicTags" | "experimentTags"
  >
> & {
  scriptLab?: Partial<ScriptLab>;
  shootPack?: Partial<ShootPack>;
  analyticsJournal?: Partial<AnalyticsJournal>;
  aiSuggestions?: Partial<AISuggestions>;
};

declare global {
  var __scenebookSampleStore:
    | {
        inboxItems: InboxItem[];
        cards: ContentCard[];
        assets: CardAsset[];
      }
    | undefined;
}

const sampleOwnerId = "sample-user";

type SupabaseQueryResult<T> = Promise<{ data: T | null; error: Error | null }>;
type SupabaseAuthResult = Promise<{ data: { user: { id: string } | null } }>;
type InboxRow = Database["public"]["Tables"]["inbox_items"]["Row"];
type ContentCardRow = Database["public"]["Tables"]["content_cards"]["Row"];
type AssetRow = Database["public"]["Tables"]["card_assets"]["Row"];
type SupabaseInsertChain = PromiseLike<{ error: Error | null }> & {
  select(query: string): {
    single(): SupabaseQueryResult<unknown>;
  };
};

type SupabaseRepositoryClient = {
  auth: {
    getUser(): SupabaseAuthResult;
  };
  from(table: string): {
    select(query: string): {
      order(column: string, options: { ascending: boolean }): SupabaseQueryResult<unknown[]>;
      single(): SupabaseQueryResult<unknown>;
    };
    insert(payload: unknown): SupabaseInsertChain;
    update(payload: unknown): {
      eq(column: string, value: string): Promise<{ error: Error | null }>;
    };
    eq(column: string, value: string): Promise<{ error: Error | null }>;
  };
};

function now() {
  return new Date().toISOString();
}

function emptyScriptLab(): ScriptLab {
  return {
    angle: "",
    hook: "",
    outline: "",
    script: "",
    caption: "",
    onScreenText: "",
    cta: "",
    notes: "",
  };
}

function emptyShootPack(): ShootPack {
  return {
    aRoll: [],
    bRoll: [],
    screenCaptures: [],
    props: [],
    missingAssets: [],
    locationNotes: "",
    visualNotes: "",
  };
}

function emptyAnalytics(): AnalyticsJournal {
  return {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    watchTimeNote: "",
    reflection: "",
    decision: "repeat",
    followUpIdea: "",
  };
}

function emptySuggestions(): AISuggestions {
  return {
    hooks: [],
    captions: [],
    rewrites: [],
    shotList: [],
    followUps: [],
    performanceSummary: "",
  };
}

function createInitialSampleStore() {
  const createdAt = now();
  const secondDate = new Date(Date.now() - 1000 * 60 * 42).toISOString();
  const thirdDate = new Date(Date.now() - 1000 * 60 * 95).toISOString();

  const cards: ContentCard[] = [
    {
      id: "card-1",
      ownerId: sampleOwnerId,
      inboxItemId: null,
      title: "Sony A7IV Cinematic Settings",
      status: "editing",
      format: "short",
      platform: "youtube",
      topicTags: ["camera", "workflow"],
      experimentTags: ["retention", "clarity"],
      scriptLab: {
        angle: "Show a practical camera setup without gear-bloat.",
        hook: "These A7IV settings fixed the muddy look in my talking-head shots.",
        outline: "Open with the bad frame, show three setting changes, end with before/after.",
        script: "Start on the flat image. Cut to menu overlays. Finish with the final graded shot and the exact settings.",
        caption: "Three Sony A7IV settings that instantly made my indoor footage look cleaner.",
        onScreenText: "PP8 • Zebras 95+ • 1/50 shutter",
        cta: "Save this before your next indoor shoot.",
        notes: "Need menu inserts and one clean desk top-down shot.",
      },
      shootPack: {
        aRoll: [
          { id: "ar-1", label: "Deliver intro line at desk", done: true },
          { id: "ar-2", label: "Menu walkthrough for picture profile", done: true },
        ],
        bRoll: [],
        screenCaptures: [],
        props: [],
        missingAssets: [],
        locationNotes: "Studio desk with side practical on.",
        visualNotes: "Keep the camera body hero-lit with a warm rim.",
      },
      analyticsJournal: emptyAnalytics(),
      aiSuggestions: {
        hooks: [
          "The A7IV wasn't the problem. My settings were.",
          "Three menu changes made this camera finally look expensive.",
        ],
        captions: [],
        rewrites: [],
        shotList: [],
        followUps: [],
        performanceSummary: "Lead with the before/after split at frame 0 for a stronger cold open.",
      },
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "card-2",
      ownerId: sampleOwnerId,
      inboxItemId: null,
      title: "Desk Lighting Reset for Creator Shoots",
      status: "ready_to_shoot",
      format: "reel",
      platform: "instagram",
      topicTags: ["lighting"],
      experimentTags: ["setup"],
      scriptLab: {
        angle: "Turn a normal desk into a cleaner on-camera environment.",
        hook: "I stopped buying lights and fixed the placement instead.",
        outline: "",
        script: "Walk through key, fill, practical, then the final frame.",
        caption: "",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      shootPack: {
        aRoll: [{ id: "ar-3", label: "Explain key light placement", done: true }],
        bRoll: [{ id: "br-1", label: "Desk lamp close-up", done: true }],
        screenCaptures: [],
        props: [],
        missingAssets: [],
        locationNotes: "",
        visualNotes: "",
      },
      analyticsJournal: emptyAnalytics(),
      aiSuggestions: emptySuggestions(),
      createdAt: secondDate,
      updatedAt: secondDate,
    },
    {
      id: "card-3",
      ownerId: sampleOwnerId,
      inboxItemId: null,
      title: "Audio Chain Cleanup Before Filming",
      status: "posted",
      format: "short",
      platform: "youtube",
      topicTags: ["audio"],
      experimentTags: ["retention"],
      scriptLab: {
        angle: "",
        hook: "My mic was fine. My gain staging wasn't.",
        outline: "",
        script: "Compare the noisy version to the cleaned chain.",
        caption: "",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      shootPack: emptyShootPack(),
      analyticsJournal: {
        ...emptyAnalytics(),
        views: 14800,
        likes: 1090,
        followUpIdea: "",
      },
      aiSuggestions: emptySuggestions(),
      createdAt: thirdDate,
      updatedAt: thirdDate,
    },
  ];

  const inboxItems: InboxItem[] = [
    {
      id: "inbox-1",
      ownerId: sampleOwnerId,
      title: "BTS of the camera menu workflow",
      notes: "Could become a carousel or a quick short with step markers.",
      sourceType: "reference",
      createdAt,
      cardId: null,
    },
    {
      id: "inbox-2",
      ownerId: sampleOwnerId,
      title: "Voice note about fixing echo with one soft surface",
      notes: "Needs a stronger visual demo before promotion.",
      sourceType: "voice",
      createdAt: secondDate,
      cardId: null,
    },
  ];

  const assets: CardAsset[] = [
    {
      id: "asset-1",
      cardId: "card-1",
      type: "video",
      title: "Intro Hook.mp4",
      url: "/media/sample-reel.mp4",
      note: "Primary camera reveal clip.",
    },
    {
      id: "asset-2",
      cardId: "card-1",
      type: "image",
      title: "Lighting Grid.jpg",
      url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
      note: "Reference still for the hero frame.",
    },
    {
      id: "asset-3",
      cardId: "card-2",
      type: "thumbnail",
      title: "Desk-before-after.png",
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      note: "Thumbnail concept for the split lighting frame.",
    },
  ];

  return { inboxItems, cards, assets };
}

function ensureSampleStore() {
  if (!globalThis.__scenebookSampleStore) {
    globalThis.__scenebookSampleStore = createInitialSampleStore();
  }

  return globalThis.__scenebookSampleStore;
}

function buildSampleCard({
  title,
  format,
  platform,
  inboxItemId,
}: {
  title: string;
  format: ContentFormat;
  platform: ContentPlatform;
  inboxItemId?: string | null;
}): ContentCard {
  const store = ensureSampleStore();
  const index = store.cards.length + 1;
  const timestamp = now();

  return {
    id: `card-${index}`,
    ownerId: sampleOwnerId,
    inboxItemId: inboxItemId ?? null,
    title,
    status: "idea",
    format,
    platform,
    topicTags: [],
    experimentTags: [],
    scriptLab: emptyScriptLab(),
    shootPack: emptyShootPack(),
    analyticsJournal: emptyAnalytics(),
    aiSuggestions: emptySuggestions(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function enrichCard(card: ContentCard) {
  const store = ensureSampleStore();
  const assets = store.assets.filter((asset) => asset.cardId === card.id);

  return {
    ...card,
    assets,
    readiness: getCardReadiness({
      scriptLab: card.scriptLab,
      shootPack: card.shootPack,
      assets,
    }),
  };
}

async function getSampleSnapshot(): Promise<WorkspaceSnapshot> {
  const store = ensureSampleStore();
  const cards = store.cards.map(enrichCard);

  return {
    sampleMode: true,
    inboxItems: [...store.inboxItems].reverse(),
    cards,
    stats: {
      inbox: store.inboxItems.filter((item) => !item.cardId).length,
      readyToShoot: cards.filter((card) => card.status === "ready_to_shoot").length,
      postedAwaitingAnalysis: cards.filter(
        (card) =>
          card.status === "posted" && !card.analyticsJournal.reflection.trim(),
      ).length,
    },
  };
}

async function createSampleInboxItem(input: {
  title: string;
  notes: string;
  sourceType: InboxItem["sourceType"];
}) {
  const store = ensureSampleStore();
  const item: InboxItem = {
    id: `inbox-${store.inboxItems.length + 1}`,
    ownerId: sampleOwnerId,
    title: input.title,
    notes: input.notes,
    sourceType: input.sourceType,
    createdAt: now(),
    cardId: null,
  };
  store.inboxItems.push(item);
  return item;
}

async function convertSampleInboxItem(input: {
  inboxItemId: string;
  title: string;
  format: ContentFormat;
  platform: ContentPlatform;
}) {
  const store = ensureSampleStore();
  const inboxItem = store.inboxItems.find((item) => item.id === input.inboxItemId);

  if (!inboxItem) {
    throw new Error("Inbox item not found.");
  }

  const card = buildSampleCard({
    title: input.title,
    format: input.format,
    platform: input.platform,
    inboxItemId: inboxItem.id,
  });

  store.cards.push(card);
  inboxItem.cardId = card.id;

  return enrichCard(card);
}

async function getSampleCard(cardId: string) {
  const store = ensureSampleStore();
  const card = store.cards.find((entry) => entry.id === cardId);

  if (!card) {
    return null;
  }

  return enrichCard(card);
}

async function updateSampleCard(cardId: string, patch: CardPatch) {
  const store = ensureSampleStore();
  const card = store.cards.find((entry) => entry.id === cardId);

  if (!card) {
    throw new Error("Card not found.");
  }

  Object.assign(card, {
    ...patch,
    scriptLab: patch.scriptLab ? { ...card.scriptLab, ...patch.scriptLab } : card.scriptLab,
    shootPack: patch.shootPack ? { ...card.shootPack, ...patch.shootPack } : card.shootPack,
    analyticsJournal: patch.analyticsJournal
      ? { ...card.analyticsJournal, ...patch.analyticsJournal }
      : card.analyticsJournal,
    aiSuggestions: patch.aiSuggestions
      ? { ...card.aiSuggestions, ...patch.aiSuggestions }
      : card.aiSuggestions,
    updatedAt: now(),
  });

  return enrichCard(card);
}

async function addSampleAsset(
  cardId: string,
  asset: Pick<CardAsset, "title" | "url" | "type" | "note">,
) {
  const store = ensureSampleStore();
  const nextAsset: CardAsset = {
    id: `asset-${store.assets.length + 1}`,
    cardId,
    title: asset.title,
    url: asset.url,
    type: asset.type,
    note: asset.note,
  };
  store.assets.push(nextAsset);
  return nextAsset;
}

async function updateSampleStatus(cardId: string, status: ContentStatus) {
  return updateSampleCard(cardId, { status });
}

function buildFallbackSuggestions(
  mode:
    | "hooks"
    | "captions"
    | "rewrites"
    | "shot-list"
    | "follow-up"
    | "performance-summary",
  card: ContentCard,
) {
  switch (mode) {
    case "hooks":
      return [
        `${card.scriptLab.hook || card.title}, but framed as a mistake I stopped making.`,
        `The ${card.title.toLowerCase()} upgrade that made my setup feel lighter.`,
        `I thought the fix was gear. It was actually ${card.title.toLowerCase()}.`,
      ];
    case "captions":
      return [
        `${card.title} without the fluff.`,
        `Three fixes, less friction, better footage.`,
        `A tiny workflow upgrade that paid off fast.`,
      ];
    case "rewrites":
      return [
        `${card.scriptLab.script} Keep the pacing brisk and practical.`,
        `Start with the pain point, then reveal the smallest useful fix.`,
      ];
    case "shot-list":
      return [
        "Open on the messy setup.",
        "Cut to the before/after detail.",
        "Close with the payoff line and CTA.",
      ];
    case "follow-up":
      return [
        `${card.title}: part two`,
        `Mistakes I made before landing on ${card.title.toLowerCase()}`,
        `How I would adapt ${card.title.toLowerCase()} for a tiny desk`,
      ];
    case "performance-summary":
      return [
        `The strongest signal came from saves and shares, which suggests the advice felt reusable. Lean into the practical framing for the next follow-up.`,
      ];
  }
}

async function generateSuggestionsWithNim(
  mode:
    | "hooks"
    | "captions"
    | "rewrites"
    | "shot-list"
    | "follow-up"
    | "performance-summary",
  card: ContentCard,
) {
  if (!env.hasAiConfig) {
    return buildFallbackSuggestions(mode, card);
  }

  const prompt = buildAssistPrompt(mode, card);
  const text = await generateText({ prompt });

  return text
    .split("\n")
    .map((line) => line.replace(/^[-*0-9.)\s]+/, "").trim())
    .filter(Boolean);
}

async function requestSampleAi(cardId: string, mode: Parameters<typeof buildAssistPrompt>[0]) {
  const detail = await getSampleCard(cardId);

  if (!detail) {
    throw new Error("Card not found.");
  }

  const suggestions = await generateSuggestionsWithNim(mode, detail);
  const nextSuggestions = { ...detail.aiSuggestions };

  if (mode === "hooks") {
    nextSuggestions.hooks = suggestions;
  } else if (mode === "captions") {
    nextSuggestions.captions = suggestions;
  } else if (mode === "rewrites") {
    nextSuggestions.rewrites = suggestions;
  } else if (mode === "shot-list") {
    nextSuggestions.shotList = suggestions;
  } else if (mode === "follow-up") {
    nextSuggestions.followUps = suggestions;
  } else {
    nextSuggestions.performanceSummary = suggestions.join(" ");
  }

  return updateSampleCard(cardId, { aiSuggestions: nextSuggestions });
}

async function getSupabaseSnapshot(): Promise<WorkspaceSnapshot> {
  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseRepositoryClient;
  const [{ data: inboxItems, error: inboxError }, { data: rows, error: cardError }, { data: assets, error: assetError }] =
    await Promise.all([
      supabase.from("inbox_items").select("*").order("created_at", { ascending: false }),
      supabase.from("content_cards").select("*").order("updated_at", { ascending: false }),
      supabase.from("card_assets").select("*").order("created_at", { ascending: true }),
    ]);

  if (inboxError ?? cardError ?? assetError) {
    throw inboxError ?? cardError ?? assetError;
  }

  const inboxRows = (inboxItems ?? []) as InboxRow[];
  const cardRows = (rows ?? []) as ContentCardRow[];
  const assetRows = (assets ?? []) as AssetRow[];

  const mappedCards: CardDetail[] = cardRows
    .map(mapCardRow)
    .map((card: ContentCard) => {
      const cardAssets: CardAsset[] = assetRows
        .filter((asset) => asset.card_id === card.id)
        .map((asset) => ({
          id: asset.id,
          cardId: asset.card_id,
        title: asset.title,
        url: asset.url,
        type: asset.type as CardAsset["type"],
        note: asset.note,
        }));

      return {
        ...card,
        assets: cardAssets,
        readiness: getCardReadiness({
          scriptLab: card.scriptLab,
          shootPack: card.shootPack,
          assets: cardAssets,
        }),
      };
    });

  return {
    sampleMode: false,
    inboxItems: inboxRows.map((item) => ({
      id: item.id,
      ownerId: item.owner_id,
      title: item.title,
      notes: item.notes,
      sourceType: item.source_type,
      createdAt: item.created_at,
      cardId: item.card_id,
    })),
    cards: mappedCards,
    stats: {
      inbox: inboxRows.filter((item) => !item.card_id).length,
      readyToShoot: mappedCards.filter((card) => card.status === "ready_to_shoot").length,
      postedAwaitingAnalysis: mappedCards.filter(
        (card) => card.status === "posted" && !card.analyticsJournal.reflection.trim(),
      ).length,
    },
  };
}

export async function getWorkspaceSnapshot() {
  return env.isSampleMode ? getSampleSnapshot() : getSupabaseSnapshot();
}

export async function createInboxItem(input: {
  title: string;
  notes: string;
  sourceType: InboxItem["sourceType"];
}) {
  if (env.isSampleMode) {
    return createSampleInboxItem(input);
  }

  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseRepositoryClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data, error } = await supabase
    .from("inbox_items")
    .insert({
      owner_id: user.id,
      title: input.title,
      notes: input.notes,
      source_type: input.sourceType,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create inbox item.");
  }

  const row = data as InboxRow;

  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    notes: row.notes,
    sourceType: row.source_type,
    createdAt: row.created_at,
    cardId: row.card_id,
  };
}

export async function convertInboxItemToCard(input: {
  inboxItemId: string;
  title: string;
  format: ContentFormat;
  platform: ContentPlatform;
}) {
  if (env.isSampleMode) {
    return convertSampleInboxItem(input);
  }

  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseRepositoryClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const insertPayload = {
    owner_id: user.id,
    inbox_item_id: input.inboxItemId,
    title: input.title,
    status: "idea",
    format: input.format,
    platform: input.platform,
    topic_tags: [],
    experiment_tags: [],
    script_lab: emptyScriptLab(),
    shoot_pack: emptyShootPack(),
    analytics_journal: emptyAnalytics(),
    ai_suggestions: emptySuggestions(),
  };

  const { data, error } = await supabase
    .from("content_cards")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create content card.");
  }

  const row = data as ContentCardRow;

  await supabase
    .from("inbox_items")
    .update({ card_id: row.id })
    .eq("id", input.inboxItemId);

  return {
    ...mapCardRow(row),
    assets: [],
    readiness: getCardReadiness({
      scriptLab: emptyScriptLab(),
      shootPack: emptyShootPack(),
      assets: [],
    }),
  };
}

export async function getCardDetail(cardId: string) {
  if (env.isSampleMode) {
    return getSampleCard(cardId);
  }

  const snapshot = await getSupabaseSnapshot();
  return snapshot.cards.find((card) => card.id === cardId) ?? null;
}

export async function updateCard(cardId: string, patch: CardPatch) {
  if (env.isSampleMode) {
    return updateSampleCard(cardId, patch);
  }

  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseRepositoryClient;
  const payload = {
    title: patch.title,
    status: patch.status,
    format: patch.format,
    platform: patch.platform,
    topic_tags: patch.topicTags,
    experiment_tags: patch.experimentTags,
    script_lab: patch.scriptLab,
    shoot_pack: patch.shootPack,
    analytics_journal: patch.analyticsJournal,
    ai_suggestions: patch.aiSuggestions,
    updated_at: now(),
  };

  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  const { error } = await supabase
    .from("content_cards")
    .update(cleaned)
    .eq("id", cardId);

  if (error) {
    throw error;
  }

  const detail = await getCardDetail(cardId);

  if (!detail) {
    throw new Error("Card not found after update.");
  }

  return detail;
}

export async function updateCardStatus(cardId: string, status: ContentStatus) {
  if (env.isSampleMode) {
    return updateSampleStatus(cardId, status);
  }

  return updateCard(cardId, { status });
}

export async function addCardAsset(
  cardId: string,
  asset: Pick<CardAsset, "title" | "url" | "type" | "note">,
) {
  if (env.isSampleMode) {
    await addSampleAsset(cardId, asset);
    const detail = await getSampleCard(cardId);

    if (!detail) {
      throw new Error("Card not found.");
    }

    return detail;
  }

  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseRepositoryClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase.from("card_assets").insert({
    owner_id: user.id,
    card_id: cardId,
    type: asset.type,
    title: asset.title,
    url: asset.url,
    note: asset.note ?? "",
  });

  if (error) {
    throw error;
  }

  const detail = await getCardDetail(cardId);

  if (!detail) {
    throw new Error("Card not found after asset insert.");
  }

  return detail;
}

export async function requestAiAssist(
  cardId: string,
  mode:
    | "hooks"
    | "captions"
    | "rewrites"
    | "shot-list"
    | "follow-up"
    | "performance-summary",
) {
  if (env.isSampleMode) {
    return requestSampleAi(cardId, mode);
  }

  const detail = await getCardDetail(cardId);

  if (!detail) {
    throw new Error("Card not found.");
  }

  const suggestions = await generateSuggestionsWithNim(mode, detail);
  const nextSuggestions = { ...detail.aiSuggestions };

  if (mode === "hooks") {
    nextSuggestions.hooks = suggestions;
  } else if (mode === "captions") {
    nextSuggestions.captions = suggestions;
  } else if (mode === "rewrites") {
    nextSuggestions.rewrites = suggestions;
  } else if (mode === "shot-list") {
    nextSuggestions.shotList = suggestions;
  } else if (mode === "follow-up") {
    nextSuggestions.followUps = suggestions;
  } else {
    nextSuggestions.performanceSummary = suggestions.join(" ");
  }

  return updateCard(cardId, { aiSuggestions: nextSuggestions });
}

export type { WorkspaceSnapshot, CardPatch, CardDetail };
