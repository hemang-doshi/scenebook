import type {
  AISuggestions,
  AnalyticsJournal,
  ContentCard,
  ScriptLab,
  ShootPack,
} from "@/lib/types";
import {
  contentFormats,
  contentPlatforms,
  contentStatuses,
} from "@/lib/types";

function defaultScriptLab(value?: Partial<ScriptLab>): ScriptLab {
  return {
    angle: value?.angle ?? "",
    hook: value?.hook ?? "",
    outline: value?.outline ?? "",
    script: value?.script ?? "",
    caption: value?.caption ?? "",
    onScreenText: value?.onScreenText ?? "",
    cta: value?.cta ?? "",
    notes: value?.notes ?? "",
  };
}

function defaultShootPack(value?: Partial<ShootPack>): ShootPack {
  return {
    aRoll: value?.aRoll ?? [],
    bRoll: value?.bRoll ?? [],
    screenCaptures: value?.screenCaptures ?? [],
    props: value?.props ?? [],
    missingAssets: value?.missingAssets ?? [],
    locationNotes: value?.locationNotes ?? "",
    visualNotes: value?.visualNotes ?? "",
  };
}

function defaultAnalyticsJournal(
  value?: Partial<AnalyticsJournal>,
): AnalyticsJournal {
  return {
    views: value?.views ?? 0,
    likes: value?.likes ?? 0,
    comments: value?.comments ?? 0,
    shares: value?.shares ?? 0,
    saves: value?.saves ?? 0,
    watchTimeNote: value?.watchTimeNote ?? "",
    reflection: value?.reflection ?? "",
    decision: value?.decision ?? "repeat",
    followUpIdea: value?.followUpIdea ?? "",
  };
}

function defaultSuggestions(
  value?: Partial<AISuggestions>,
): AISuggestions {
  return {
    hooks: value?.hooks ?? [],
    captions: value?.captions ?? [],
    rewrites: value?.rewrites ?? [],
    shotList: value?.shotList ?? [],
    followUps: value?.followUps ?? [],
    performanceSummary: value?.performanceSummary ?? "",
  };
}

type CardRow = {
  id: string;
  owner_id: string;
  inbox_item_id?: string | null;
  title: string;
  status: string;
  format: string;
  platform: string;
  topic_tags?: string[] | null;
  experiment_tags?: string[] | null;
  script_lab?: unknown;
  shoot_pack?: unknown;
  analytics_journal?: unknown;
  ai_suggestions?: unknown;
  created_at: string;
  updated_at: string;
};

export function mapCardRow(row: CardRow): ContentCard {
  const status = contentStatuses.includes(row.status as (typeof contentStatuses)[number])
    ? (row.status as (typeof contentStatuses)[number])
    : "idea";
  const format = contentFormats.includes(row.format as (typeof contentFormats)[number])
    ? (row.format as (typeof contentFormats)[number])
    : "short";
  const platform = contentPlatforms.includes(row.platform as (typeof contentPlatforms)[number])
    ? (row.platform as (typeof contentPlatforms)[number])
    : "youtube";

  return {
    id: row.id,
    ownerId: row.owner_id,
    inboxItemId: row.inbox_item_id ?? null,
    title: row.title,
    status,
    format,
    platform,
    topicTags: row.topic_tags ?? [],
    experimentTags: row.experiment_tags ?? [],
    scriptLab: defaultScriptLab(row.script_lab as Partial<ScriptLab> | undefined),
    shootPack: defaultShootPack(row.shoot_pack as Partial<ShootPack> | undefined),
    analyticsJournal: defaultAnalyticsJournal(
      row.analytics_journal as Partial<AnalyticsJournal> | undefined,
    ),
    aiSuggestions: defaultSuggestions(
      row.ai_suggestions as Partial<AISuggestions> | undefined,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
