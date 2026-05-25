"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";
import { DOCK_ITEMS } from "@/lib/editor/types";
import TemplatesPanel from "./panels/TemplatesPanel";
import UploadsPanel from "./panels/UploadsPanel";
import MediaPanel from "./panels/MediaPanel";
import TextPanel from "./panels/TextPanel";
import CaptionsPanel from "./panels/CaptionsPanel";
import ElementsPanel from "./panels/ElementsPanel";
import AudioPanel from "./panels/AudioPanel";
import BrandPanel from "./panels/BrandPanel";
import AiToolsPanel from "./panels/AiToolsPanel";
import SyncPanel from "./panels/SyncPanel";

const panelMap: Record<string, React.ComponentType> = {
  sync: SyncPanel,
  templates: TemplatesPanel,
  uploads: UploadsPanel,
  media: MediaPanel,
  text: TextPanel,
  captions: CaptionsPanel,
  elements: ElementsPanel,
  audio: AudioPanel,
  brand: BrandPanel,
  ai: AiToolsPanel,
};

export default function AssetPanel() {
  const activeDockItem = useEditorStore((s) => s.activeDockItem);
  const setActiveDockItem = useEditorStore((s) => s.setActiveDockItem);

  if (!activeDockItem) return null;

  const PanelContent = panelMap[activeDockItem];
  const dockMeta = DOCK_ITEMS.find((d) => d.id === activeDockItem);

  return (
    <AnimatePresence>
      <motion.div
        key={activeDockItem}
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -280, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex w-[280px] shrink-0 flex-col border-r border-[var(--ed-border-subtle)] bg-[var(--ed-surface)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--ed-border-subtle)] px-3 py-2.5">
          <span className="text-xs font-semibold">{dockMeta?.label ?? ""}</span>
          <button
            onClick={() => setActiveDockItem(null)}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 ed-scrollbar">
          {PanelContent && <PanelContent />}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
