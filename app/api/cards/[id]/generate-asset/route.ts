import { NextResponse } from "next/server";
import { z } from "zod";
import { getCardDetail, addCardAsset } from "@/lib/data/repository";
import { generateText } from "@/lib/ai/client";

const requestSchema = z.object({
  type: z.enum(["hook", "b-roll", "voiceover", "thumbnail"]),
  userPrompt: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, userPrompt } = requestSchema.parse(body);

    // 1. Fetch card context
    const card = await getCardDetail(id);
    if (!card) {
      return NextResponse.json({ error: "Content card not found." }, { status: 404 });
    }

    // 2. Build prompt based on type and context
    let prompt = "";
    let systemInstruction = "";
    let assetTitle = "";
    let assetType: "image" | "video" | "audio" | "document" | "thumbnail" = "document";
    let assetUrl = "";

    const contextStr = `
Title: ${card.title}
Platform: ${card.platform}
Format: ${card.format}
Angle: ${card.scriptLab.angle}
Script: ${card.scriptLab.script}
Notes: ${card.scriptLab.notes}
    `.trim();

    if (type === "hook") {
      systemInstruction = "You are a professional video editor and viral hook writer. Generate a highly engaging, high-retention hook text.";
      prompt = `
Context of the video:
${contextStr}
${userPrompt ? `User instructions: ${userPrompt}` : ""}
Please write ONE short, powerful, clickable video hook (max 15 words) that can be overlaid on screen or spoken. Do not include quotes, intro text, or tags. Just return the hook text itself.
      `.trim();
      assetTitle = "AI Generated Hook";
      assetType = "document";
      assetUrl = "text-overlay-placeholder";
    } else if (type === "b-roll") {
      systemInstruction = "You are a creative director. Suggest a specific, visually rich B-Roll shot idea that matches the script context.";
      prompt = `
Context of the video:
${contextStr}
${userPrompt ? `User instructions: ${userPrompt}` : ""}
Describe ONE specific B-Roll shot concept (camera angle, action, lighting details). Keep it short (max 25 words). Just return the description.
      `.trim();
      assetTitle = "AI B-Roll Concept";
      assetType = "video";
      assetUrl = "/media/sample-reel.mp4"; // standard previewable reference
    } else if (type === "voiceover") {
      systemInstruction = "You are a voiceover artist and scriptwriter. Write a clean, natural narration script.";
      prompt = `
Context of the video:
${contextStr}
${userPrompt ? `User instructions: ${userPrompt}` : ""}
Write ONE clean, spoken sentence (max 25 words) of voiceover narration that bridges the hook and the main content. Just return the narration text.
      `.trim();
      assetTitle = "AI Voiceover Narration";
      assetType = "audio";
      assetUrl = "speech-synthesis-placeholder";
    } else if (type === "thumbnail") {
      systemInstruction = "You are a graphic designer. Describe a highly engaging thumbnail mockup concept.";
      prompt = `
Context of the video:
${contextStr}
${userPrompt ? `User instructions: ${userPrompt}` : ""}
Describe a high-clickthrough thumbnail concept (layout, text overlays, expression). Keep it short (max 30 words). Just return the concept description.
      `.trim();
      assetTitle = "AI Thumbnail Concept";
      assetType = "thumbnail";
      // standard high-quality mockup placeholder
      assetUrl = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";
    }

    // 3. Generate text
    const resultText = await generateText({ prompt, systemInstruction });
    const cleanResult = resultText.replace(/^["'\s]+|["'\s]+$/g, "").trim();

    // 4. Save asset
    const updatedCard = await addCardAsset(id, {
      title: `${assetTitle} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      type: assetType,
      url: assetUrl,
      note: cleanResult,
    });

    return NextResponse.json(updatedCard);
  } catch (caught) {
    console.error("AI asset generation error:", caught);
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to generate AI asset." },
      { status: 400 },
    );
  }
}
