import { NextResponse } from "next/server";

import { analyzeProjectReadiness, fallbackReadinessAnalysis } from "@/lib/agent/readiness/readiness-analysis";
import type { AiReadinessAnalysis } from "@/lib/agent/readiness/readiness-schema";
import {
  buildProjectMind,
  listProjectMemories,
  saveProjectMemory,
} from "@/lib/agent/runtime-v4/memory/project-mind";

function analysisFromMemory(content: Record<string, unknown>): AiReadinessAnalysis | null {
  if (content.kind !== "ai_readiness_analysis") {
    return null;
  }

  return content as unknown as AiReadinessAnalysis;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const memories = await listProjectMemories(id, 20).catch(() => []);
    const latest = memories
      .map((memory) => analysisFromMemory(memory.content))
      .find((analysis): analysis is AiReadinessAnalysis => Boolean(analysis));

    if (latest) {
      return NextResponse.json({ analysis: latest, cached: true });
    }

    const snapshot = await buildProjectMind({ projectId: id });
    return NextResponse.json({ analysis: fallbackReadinessAnalysis(snapshot), cached: false });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to load readiness." },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const modelOverride = typeof body.modelOverride === "string" ? body.modelOverride : undefined;
    const analysis = await analyzeProjectReadiness({
      projectId: id,
      modelOverride,
      forceRefresh: true,
    });

    if (!analysis.fallbackUsed) {
      await saveProjectMemory({
        projectId: id,
        memoryType: "workflow_checkpoint",
        source: "agent",
        summary: analysis.summary,
        confidence: analysis.confidence,
        content: {
          kind: "ai_readiness_analysis",
          score: analysis.score,
          label: analysis.label,
          stage: analysis.stage,
          blockers: analysis.blockers,
          nextActions: analysis.nextActions,
          evidence: analysis.evidence,
          generatedAt: analysis.generatedAt ?? new Date().toISOString(),
          model: analysis.model ?? modelOverride ?? "default routing",
          fallbackUsed: false,
        },
      });
    }

    return NextResponse.json({ analysis, cached: false });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to run readiness check." },
      { status: 400 },
    );
  }
}
