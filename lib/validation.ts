import { z } from "zod";

import {
  contentFormats,
  contentPlatforms,
  contentStatuses,
  learningDecisions,
} from "@/lib/types";

const requiredText = z.string().trim().min(1);

const checklistItemSchema = z.object({
  id: requiredText,
  label: requiredText,
  done: z.boolean(),
});

const scriptLabSchema = z.object({
  angle: z.string().default(""),
  hook: z.string().default(""),
  outline: z.string().default(""),
  script: z.string().default(""),
  caption: z.string().default(""),
  onScreenText: z.string().default(""),
  cta: z.string().default(""),
  notes: z.string().default(""),
});

const shootPackSchema = z.object({
  aRoll: z.array(checklistItemSchema).default([]),
  bRoll: z.array(checklistItemSchema).default([]),
  screenCaptures: z.array(checklistItemSchema).default([]),
  props: z.array(checklistItemSchema).default([]),
  missingAssets: z.array(checklistItemSchema).default([]),
  locationNotes: z.string().default(""),
  visualNotes: z.string().default(""),
});

const analyticsJournalSchema = z.object({
  views: z.number().int().nonnegative().default(0),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
  saves: z.number().int().nonnegative().default(0),
  watchTimeNote: z.string().default(""),
  reflection: z.string().default(""),
  decision: z.enum(learningDecisions).default("repeat"),
  followUpIdea: z.string().default(""),
});

export const createInboxItemSchema = z.object({
  title: requiredText,
  notes: z.string().default(""),
  sourceType: z.enum(["text", "link", "reference", "voice"]),
});

export const createNoteCardFromInboxSchema = z.object({
  inboxItemId: requiredText,
  title: requiredText,
  format: z.enum(contentFormats),
  platform: z.enum(contentPlatforms),
});

export const createProjectSchema = z.object({
  title: requiredText,
  format: z.enum(contentFormats),
  platform: z.enum(contentPlatforms),
});

export const updateContentCardSchema = z.object({
  title: requiredText,
  status: z.enum(contentStatuses),
  topicTags: z.array(requiredText).default([]),
  scriptLab: scriptLabSchema.default({
    angle: "",
    hook: "",
    outline: "",
    script: "",
    caption: "",
    onScreenText: "",
    cta: "",
    notes: "",
  }),
  shootPack: shootPackSchema.default({
    aRoll: [],
    bRoll: [],
    screenCaptures: [],
    props: [],
    missingAssets: [],
    locationNotes: "",
    visualNotes: "",
  }),
  analyticsJournal: analyticsJournalSchema.default({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    watchTimeNote: "",
    reflection: "",
    decision: "repeat",
    followUpIdea: "",
  }),
});
