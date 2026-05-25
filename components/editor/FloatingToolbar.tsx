"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Crop,
  RefreshCw,
  Copy,
  Trash2,
  Bold,
  Italic,
  AlignCenter,
  Palette,
  Volume2,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";
import type { CanvasObject } from "@/lib/editor/types";

interface Props {
  object: CanvasObject;
}

export default function FloatingToolbar({ object }: Props) {
  const removeCanvasObject = useEditorStore((s) => s.removeCanvasObject);
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);

  const actions: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[] = [];

  if (object.type === "video" || object.type === "image") {
    actions.push(
      { icon: <Crop className="h-3.5 w-3.5" />, label: "Crop", onClick: () => {} },
      { icon: <RefreshCw className="h-3.5 w-3.5" />, label: "Replace", onClick: () => {} },
      { icon: <Copy className="h-3.5 w-3.5" />, label: "Duplicate", onClick: () => addCanvasObject(object.type, object.label + " copy") },
      { icon: <Trash2 className="h-3.5 w-3.5" />, label: "Delete", onClick: () => removeCanvasObject(object.id), danger: true },
    );
  } else if (object.type === "text" || object.type === "caption") {
    actions.push(
      { icon: <Bold className="h-3.5 w-3.5" />, label: "Bold", onClick: () => {} },
      { icon: <Italic className="h-3.5 w-3.5" />, label: "Italic", onClick: () => {} },
      { icon: <AlignCenter className="h-3.5 w-3.5" />, label: "Align", onClick: () => {} },
      { icon: <Palette className="h-3.5 w-3.5" />, label: "Color", onClick: () => {} },
      { icon: <Copy className="h-3.5 w-3.5" />, label: "Duplicate", onClick: () => addCanvasObject(object.type, object.label + " copy") },
      { icon: <Trash2 className="h-3.5 w-3.5" />, label: "Delete", onClick: () => removeCanvasObject(object.id), danger: true },
    );
  } else {
    actions.push(
      { icon: <Volume2 className="h-3.5 w-3.5" />, label: "Volume", onClick: () => {} },
      { icon: <Copy className="h-3.5 w-3.5" />, label: "Duplicate", onClick: () => addCanvasObject(object.type, object.label + " copy") },
      { icon: <Trash2 className="h-3.5 w-3.5" />, label: "Delete", onClick: () => removeCanvasObject(object.id), danger: true },
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="absolute z-30 flex items-center gap-0.5 rounded-[var(--ed-radius-lg)] border border-[var(--ed-border)] bg-[var(--ed-surface-raised)] px-1.5 py-1 shadow-xl"
        style={{
          left: object.x + object.width / 2,
          top: object.y - 44,
          transform: "translateX(-50%)",
        }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            title={action.label}
            className={`flex h-7 w-7 items-center justify-center rounded-[var(--ed-radius-sm)] transition ${
              action.danger
                ? "text-[var(--ed-text-muted)] hover:bg-red-500/10 hover:text-[var(--ed-danger)]"
                : "text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)] hover:text-[var(--ed-text-primary)]"
            }`}
          >
            {action.icon}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
