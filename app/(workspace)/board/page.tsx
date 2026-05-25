"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { 
  Film, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Loader2, 
  Filter,
  CheckSquare
} from "lucide-react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { statusLabels } from "@/lib/domain/content";
import { fetchJson } from "@/lib/fetcher";
import type { ContentFormat, ContentPlatform, ContentStatus } from "@/lib/types";
import type { CardDetail } from "@/lib/data/repository";

const boardStatuses: ContentStatus[] = [
  "idea",
  "scripted",
  "ready_to_shoot",
  "shot",
  "editing",
  "posted",
  "analyzed",
  "archived",
];

const platformStyles: Record<string, string> = {
  youtube: "bg-red-500/10 text-red-400 border-red-500/20",
  instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  tiktok: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  linkedin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  x: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
};

export default function BoardPage() {
  const { data, error, isLoading, refresh } = useWorkspaceSnapshot();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const cards = useMemo(() => {
    if (!data) return [];
    return data.cards.filter((card) => {
      const matchesPlatform =
        platformFilter === "all" || card.platform === (platformFilter as ContentPlatform);
      const matchesFormat =
        formatFilter === "all" || card.format === (formatFilter as ContentFormat);
      return matchesPlatform && matchesFormat;
    });
  }, [data, formatFilter, platformFilter]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const nextStatus = over.id as ContentStatus;

    const card = data?.cards.find((c) => c.id === cardId);
    if (!card || card.status === nextStatus) return;

    startTransition(async () => {
      try {
        await fetchJson(`/api/cards/${cardId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        refresh();
      } catch (err) {
        console.error("Failed to update status on drag drop:", err);
      }
    });
  };

  const moveCardOneStep = (cardId: string, currentStatus: ContentStatus, direction: "next" | "prev") => {
    const currentIndex = boardStatuses.indexOf(currentStatus);
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= boardStatuses.length) return;

    const nextStatus = boardStatuses[nextIndex];
    startTransition(async () => {
      try {
        await fetchJson(`/api/cards/${cardId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        refresh();
      } catch (err) {
        console.error("Failed to move card status:", err);
      }
    });
  };

  if (isLoading) {
    return <Panel className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></Panel>;
  }

  if (error || !data) {
    return <Panel>{error ?? "Unable to load board."}</Panel>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          eyebrow="Pipeline"
          title="Production Board"
          description="Drag cards across columns to progress them from raw capture to posted and analyzed. Use quick actions to jump straight into editing."
        />
        <div className="flex items-center gap-2">
          <Link href="/inbox">
            <Button className="font-mono text-[10px] uppercase tracking-wider h-8 px-3">
              Capture Idea
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <Panel className="flex flex-wrap items-center justify-between gap-4 bg-surface-soft/60 border-border/80 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted font-mono uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5" /> Filters:
          </div>
          <Select 
            value={platformFilter} 
            onChange={(event) => setPlatformFilter(event.target.value)}
            className="w-40 font-mono text-xs"
          >
            <option value="all">ALL PLATFORMS</option>
            <option value="instagram">INSTAGRAM</option>
            <option value="youtube">YOUTUBE</option>
            <option value="tiktok">TIKTOK</option>
            <option value="linkedin">LINKEDIN</option>
            <option value="x">X</option>
          </Select>

          <Select 
            value={formatFilter} 
            onChange={(event) => setFormatFilter(event.target.value)}
            className="w-40 font-mono text-xs"
          >
            <option value="all">ALL FORMATS</option>
            <option value="reel">REEL</option>
            <option value="short">SHORT</option>
            <option value="tiktok">TIKTOK</option>
            <option value="carousel">CAROUSEL</option>
            <option value="post">POST</option>
            <option value="vlog">VLOG</option>
          </Select>
        </div>
        
        {isPending && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-accent uppercase tracking-wider animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating Board...
          </div>
        )}
      </Panel>

      {/* Drag & Drop Board Context */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin h-[calc(100vh-270px)] min-h-[500px]">
          {boardStatuses.map((status) => {
            const statusCards = cards.filter((card) => card.status === status);

            return (
              <DroppableColumn key={status} status={status} title={statusLabels[status]} count={statusCards.length}>
                <div className="space-y-3 mt-4">
                  {statusCards.map((card) => {
                    const completedTasks = card.shootPack.aRoll.filter(t => t.done).length;
                    const totalTasks = card.shootPack.aRoll.length;
                    
                    return (
                      <DraggableCard 
                        key={card.id} 
                        card={card}
                        completedTasks={completedTasks}
                        totalTasks={totalTasks}
                        onMoveLeft={() => moveCardOneStep(card.id, status, "prev")}
                        onMoveRight={() => moveCardOneStep(card.id, status, "next")}
                        showLeft={status !== "idea"}
                        showRight={status !== "archived"}
                      />
                    );
                  })}

                  {statusCards.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/40 p-4 py-8 text-center text-xs text-muted-foreground bg-black/5">
                      No cards here
                    </div>
                  )}
                </div>
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

/* Droppable Column Component */
function DroppableColumn({ 
  status, 
  title, 
  count, 
  children 
}: { 
  status: string; 
  title: string; 
  count: number; 
  children: React.ReactNode 
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[280px] min-w-[280px] rounded-xl border p-3 transition-colors ${
        isOver 
          ? "border-accent bg-accent/[0.03] shadow-[0_0_15px_rgba(99,102,241,0.05)]" 
          : "border-border/60 bg-surface-soft/40"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/30 pb-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <Badge className="bg-zinc-800 text-muted-foreground border border-border/50 text-[9px] px-1.5 py-0.5">{count}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto ed-scrollbar pr-0.5">
        {children}
      </div>
    </div>
  );
}

/* Draggable Card Component */
function DraggableCard({ 
  card, 
  completedTasks,
  totalTasks,
  onMoveLeft,
  onMoveRight,
  showLeft,
  showRight
}: { 
  card: CardDetail; 
  completedTasks: number;
  totalTasks: number;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  showLeft: boolean;
  showRight: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const preventDrag = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group cursor-grab active:cursor-grabbing select-none rounded-xl border border-border/50 bg-black/25 p-4 space-y-3 transition-all duration-300 hover:border-accent/40 hover:bg-black/35 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] ${
        isDragging ? "shadow-2xl border-accent" : ""
      }`}
    >
      <div>
        <h4 className="text-xs font-semibold text-foreground leading-snug group-hover:text-accent transition-colors duration-200">{card.title}</h4>
      </div>

      {/* Info Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={`font-mono uppercase text-[8px] px-1 py-0 border ${platformStyles[card.platform] || "bg-zinc-800 border-border text-muted"}`}>
          {card.platform}
        </Badge>
        <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground border border-border/40 px-1.5 py-0.5 rounded">
          {card.format}
        </span>
      </div>

      {/* Progress & Readiness */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground">
          <span>Readiness</span>
          <span>{card.readiness.score}%</span>
        </div>
        
        {totalTasks > 0 && (
          <div className="flex items-center gap-1 text-[9px] font-mono text-accent">
            <CheckSquare className="h-2.5 w-2.5" />
            <span>{completedTasks}/{totalTasks} tasks</span>
          </div>
        )}
      </div>

      {/* Actions (Hover Overlay Controls) */}
      <div 
        className="flex items-center justify-between border-t border-border/30 pt-3 mt-1"
        onPointerDown={preventDrag}
        onClick={preventDrag}
      >
        <div className="flex gap-1.5">
          <Link href={`/cards/${card.id}`}>
            <button className="p-1.5 hover:bg-white/5 border border-border rounded text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer" title="Workspace Details">
              <FileText className="h-3 w-3" />
            </button>
          </Link>
          <Link href={`/studio/${card.id}`}>
            <button className="p-1.5 hover:bg-white/5 border border-border rounded text-[10px] text-muted-foreground hover:text-foreground transition cursor-pointer" title="Studio Editor">
              <Film className="h-3 w-3" />
            </button>
          </Link>
        </div>

        {/* Move controls */}
        <div className="flex gap-1">
          {showLeft && (
            <button 
              onClick={onMoveLeft}
              className="p-1 hover:bg-white/5 border border-border rounded text-muted-foreground hover:text-accent transition cursor-pointer" 
              title="Move left"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
          )}
          {showRight && (
            <button 
              onClick={onMoveRight}
              className="p-1 hover:bg-white/5 border border-border rounded text-muted-foreground hover:text-accent transition cursor-pointer" 
              title="Move right"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
