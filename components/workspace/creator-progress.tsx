"use client";

import Link from "next/link";
import { Check, Edit3, Eye, FileText, Lightbulb, Play } from "lucide-react";
import type { ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProgressStage {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  statuses: ContentStatus[];
  route: (cardId: string) => string;
}

const STAGES: ProgressStage[] = [
  {
    id: "idea",
    label: "Idea Capture",
    description: "Convert capture to card",
    icon: Lightbulb,
    statuses: ["idea"],
    route: (id) => `/cards/${id}`,
  },
  {
    id: "script",
    label: "Script & Prep",
    description: "Write outline & checklists",
    icon: FileText,
    statuses: ["scripted", "ready_to_shoot"],
    route: (id) => `/cards/${id}`,
  },
  {
    id: "edit",
    label: "Shoot & Edit",
    description: "Studio timeline & effects",
    icon: Edit3,
    statuses: ["shot", "editing"],
    route: (id) => `/studio/${id}`,
  },
  {
    id: "publish",
    label: "Published",
    description: "Live on platform",
    icon: Play,
    statuses: ["posted"],
    route: (id) => `/cards/${id}`,
  },
  {
    id: "reflection",
    label: "Reflection",
    description: "Analytics & learning",
    icon: Eye,
    statuses: ["analyzed", "archived"],
    route: (id) => `/cards/${id}`,
  },
];

export function CreatorProgress({
  currentStatus,
  cardId,
}: {
  currentStatus: ContentStatus;
  cardId: string;
}) {
  // Find index of current stage
  const currentStageIndex = STAGES.findIndex((stage) =>
    stage.statuses.includes(currentStatus),
  );

  return (
    <div className="w-full rounded-2xl border border-border bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="cmd-label text-accent font-semibold tracking-wider">Creator Journey</p>
          <h3 className="text-sm text-muted mt-1">Lifecycle roadmap for this piece of content</h3>
        </div>
        <div className="flex gap-2">
          {currentStageIndex !== -1 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent border border-accent/25 animate-pulse">
              Current: {STAGES[currentStageIndex].label}
            </span>
          )}
        </div>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
        {/* Connector line for large screens */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-0.5 -translate-y-1/2 bg-border hidden md:block" />

        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCurrent = stage.statuses.includes(currentStatus);
          const isCompleted = idx < currentStageIndex;
          const isPending = idx > currentStageIndex && currentStageIndex !== -1;

          const cardLink = stage.route(cardId);

          return (
            <Link
              key={stage.id}
              href={cardLink}
              className={cn(
                "relative z-10 flex flex-row md:flex-col items-center gap-3 md:gap-2 rounded-xl p-3 md:p-2 text-left md:text-center transition duration-200 border",
                isCurrent
                  ? "border-accent bg-accent/8 shadow-[0_0_15px_rgba(212,255,51,0.08)] scale-[1.02]"
                  : "border-transparent hover:bg-white/5",
              )}
            >
              {/* Stage Icon Circle */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs transition duration-200",
                  isCurrent && "border-accent bg-accent text-accent-foreground shadow-[0_0_10px_rgba(212,255,51,0.4)]",
                  isCompleted && "border-success bg-success/20 text-success",
                  isPending && "border-border bg-black/40 text-muted",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Label Text */}
              <div className="flex flex-col md:items-center">
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.08em] font-semibold",
                    isCurrent && "text-accent",
                    isCompleted && "text-success",
                    isPending && "text-muted",
                  )}
                >
                  {stage.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {stage.description}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
