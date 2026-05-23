import { NextResponse } from "next/server";
import { z } from "zod";

import { getCardDetail, updateCard } from "@/lib/data/repository";
import {
  contentFormats,
  contentPlatforms,
  contentStatuses,
  learningDecisions,
} from "@/lib/types";

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  status: z.enum(contentStatuses).optional(),
  format: z.enum(contentFormats).optional(),
  platform: z.enum(contentPlatforms).optional(),
  topicTags: z.array(z.string()).optional(),
  experimentTags: z.array(z.string()).optional(),
  scriptLab: z
    .object({
      angle: z.string().optional(),
      hook: z.string().optional(),
      outline: z.string().optional(),
      script: z.string().optional(),
      caption: z.string().optional(),
      onScreenText: z.string().optional(),
      cta: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  shootPack: z
    .object({
      aRoll: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })).optional(),
      bRoll: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })).optional(),
      screenCaptures: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })).optional(),
      props: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })).optional(),
      missingAssets: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })).optional(),
      locationNotes: z.string().optional(),
      visualNotes: z.string().optional(),
    })
    .optional(),
  analyticsJournal: z
    .object({
      views: z.number().int().nonnegative().optional(),
      likes: z.number().int().nonnegative().optional(),
      comments: z.number().int().nonnegative().optional(),
      shares: z.number().int().nonnegative().optional(),
      saves: z.number().int().nonnegative().optional(),
      watchTimeNote: z.string().optional(),
      reflection: z.string().optional(),
      decision: z.enum(learningDecisions).optional(),
      followUpIdea: z.string().optional(),
    })
    .optional(),
})
  .strict();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await getCardDetail(id);

  if (!card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  return NextResponse.json(card);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const patch = patchSchema.parse(await request.json());
    const card = await updateCard(id, patch);
    return NextResponse.json(card);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to update card." },
      { status: 400 },
    );
  }
}
