"use client";

import {
  LayoutTemplate,
  Upload,
  Film,
  Type,
  MessageSquare,
  Shapes,
  Music,
  Palette,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";
import { DOCK_ITEMS } from "@/lib/editor/types";
import type { DockItem } from "@/lib/editor/types";

const iconMap: Record<string, LucideIcon> = {
  sync: RefreshCw,
  LayoutTemplate,
  Upload,
  Film,
  Type,
  MessageSquare,
  Shapes,
  Music,
  Palette,
  Sparkles,
};

export default function LeftDock() {
  const activeDockItem = useEditorStore((s) => s.activeDockItem);
  const setActiveDockItem = useEditorStore((s) => s.setActiveDockItem);

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-[var(--ed-border-subtle)] bg-[var(--ed-surface)] py-2">
      {DOCK_ITEMS.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = activeDockItem === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveDockItem(item.id as DockItem)}
            title={item.label}
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--ed-radius-md)] transition ${
              isActive
                ? "bg-[var(--ed-accent-soft)] text-[var(--ed-accent)]"
                : "text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-secondary)]"
            }`}
          >
            {Icon && <Icon className="h-[18px] w-[18px]" />}
          </button>
        );
      })}
    </div>
  );
}
