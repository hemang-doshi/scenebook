export const contentStatuses = [
  "inbox",
  "idea",
  "scripted",
  "ready_to_shoot",
  "shot",
  "editing",
  "posted",
  "analyzed",
  "archived",
] as const;

export const contentFormats = [
  "reel",
  "short",
  "tiktok",
  "carousel",
  "post",
  "vlog",
] as const;

export const contentPlatforms = [
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "x",
] as const;

export const assetTypes = [
  "image",
  "video",
  "audio",
  "document",
  "link",
  "thumbnail",
] as const;

export const learningDecisions = ["repeat", "remix", "retire"] as const;

export type ContentStatus = (typeof contentStatuses)[number];
export type ContentFormat = (typeof contentFormats)[number];
export type ContentPlatform = (typeof contentPlatforms)[number];
export type AssetType = (typeof assetTypes)[number];
export type LearningDecision = (typeof learningDecisions)[number];

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ScriptLab = {
  angle: string;
  hook: string;
  outline: string;
  script: string;
  caption: string;
  onScreenText: string;
  cta: string;
  notes: string;
};

export type ShootPack = {
  aRoll: ChecklistItem[];
  bRoll: ChecklistItem[];
  screenCaptures: ChecklistItem[];
  props: ChecklistItem[];
  missingAssets: ChecklistItem[];
  locationNotes: string;
  visualNotes: string;
};

export type AnalyticsJournal = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeNote: string;
  reflection: string;
  decision: LearningDecision;
  followUpIdea: string;
};

export type CardAsset = {
  id: string;
  cardId?: string;
  type: AssetType;
  title: string;
  url: string;
  note?: string;
};

export type AISuggestions = {
  hooks: string[];
  captions: string[];
  rewrites: string[];
  shotList: string[];
  followUps: string[];
  performanceSummary: string;
};

export type ContentCard = {
  id: string;
  ownerId: string;
  inboxItemId?: string | null;
  title: string;
  status: ContentStatus;
  format: ContentFormat;
  platform: ContentPlatform;
  topicTags: string[];
  experimentTags: string[];
  scriptLab: ScriptLab;
  shootPack: ShootPack;
  analyticsJournal: AnalyticsJournal;
  aiSuggestions: AISuggestions;
  createdAt: string;
  updatedAt: string;
};

export type InboxItem = {
  id: string;
  ownerId: string;
  title: string;
  notes: string;
  sourceType: "text" | "link" | "reference" | "voice";
  createdAt: string;
  cardId?: string | null;
};
