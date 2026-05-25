"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/editor-store";
import { ASPECT_RATIOS } from "@/lib/editor/types";
import FloatingToolbar from "./FloatingToolbar";

export default function CanvasStage() {
  const aspectRatio = useEditorStore((s) => s.aspectRatio);
  const canvasObjects = useEditorStore((s) => s.canvasObjects);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectObject = useEditorStore((s) => s.selectObject);
  const deselectAll = useEditorStore((s) => s.deselectAll);

  const containerRef = useRef<HTMLDivElement>(null);
  const [artboardSize, setArtboardSize] = useState({ width: 0, height: 0 });

  const calculateSize = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const pad = 48;
    const maxW = clientWidth - pad * 2;
    const maxH = clientHeight - pad * 2;
    const ratio = ASPECT_RATIOS[aspectRatio];
    const artboardAspect = ratio.w / ratio.h;

    let w = maxW;
    let h = w / artboardAspect;
    if (h > maxH) {
      h = maxH;
      w = h * artboardAspect;
    }
    setArtboardSize({ width: Math.round(w), height: Math.round(h) });
  }, [aspectRatio]);

  useEffect(() => {
    calculateSize();
    const obs = new ResizeObserver(calculateSize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [calculateSize]);

  const selectedObj = canvasObjects.find((o) => o.id === selectedObjectId);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(88,101,242,0.22),transparent_40%),linear-gradient(180deg,rgba(13,17,28,0.96),rgba(6,8,14,1))]"
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.artboard) {
          deselectAll();
        }
      }}
    >
      {/* Artboard */}
      <div
        data-artboard="true"
        className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,40,0.95),rgba(10,12,20,0.98))] shadow-2xl"
        style={{ width: artboardSize.width, height: artboardSize.height }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%)]" />

        {canvasObjects.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Live preview
            </div>
            <div className="max-w-[320px] space-y-2">
              <p className="text-lg font-semibold text-white/90">Select an asset to place it on the canvas</p>
              <p className="text-sm leading-relaxed text-white/50">
                Storyboard assets arrive here with a live glass-lit stage instead of an empty black frame.
              </p>
            </div>
          </div>
        ) : null}

        {/* Canvas objects */}
        {canvasObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          const typeColors: Record<string, string> = {
            video: "#2f3f75", image: "#2f3f75", text: "#3f2f75",
            caption: "#3f2f75", audio: "#2f6054",
          };
          return (
            <div
              key={obj.id}
              onClick={(e) => { e.stopPropagation(); selectObject(obj.id); }}
              className="absolute flex cursor-pointer items-center justify-center text-[10px] font-medium text-white/80 transition-shadow hover:shadow-lg"
              style={{
                left: obj.x,
                top: obj.y,
                width: obj.width,
                height: obj.height,
                background: typeColors[obj.type] ?? "#2f3f75",
                borderRadius: "var(--ed-radius-sm)",
                opacity: obj.opacity,
                transform: `rotate(${obj.rotation}deg)`,
                border: isSelected ? "2px dashed var(--ed-accent)" : "1px solid transparent",
                boxShadow: isSelected ? "0 0 0 1px var(--ed-accent)" : undefined,
              }}
            >
              {obj.label}
              {isSelected && (
                <>
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-sm bg-[var(--ed-accent)]" />
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-sm bg-[var(--ed-accent)]" />
                  <span className="absolute -bottom-1 -left-1 h-2 w-2 rounded-sm bg-[var(--ed-accent)]" />
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-sm bg-[var(--ed-accent)]" />
                </>
              )}
            </div>
          );
        })}

        {/* Aspect ratio label */}
        <span className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/40">
          {aspectRatio}
        </span>
      </div>

      {/* Floating toolbar */}
      {selectedObj && <FloatingToolbar object={selectedObj} />}
    </div>
  );
}
