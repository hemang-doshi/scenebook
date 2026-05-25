"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Layers } from "lucide-react";
import { useEditorStore } from "@/lib/editor/editor-store";

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--ed-border-subtle)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)] transition hover:text-[var(--ed-text-secondary)]"
      >
        {title}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[500px] pb-3" : "max-h-0"}`}>
        <div className="space-y-2 px-3">{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[10px] text-[var(--ed-text-muted)]">{label}</span>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, step = 1, suffix }: { value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-20 rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] px-2 text-right text-xs text-[var(--ed-text-primary)]"
      />
      {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[var(--ed-text-muted)]">{suffix}</span>}
    </div>
  );
}

export default function RightInspector() {
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const canvasObjects = useEditorStore((s) => s.canvasObjects);
  const clips = useEditorStore((s) => s.clips);
  const tracks = useEditorStore((s) => s.tracks);
  const updateCanvasObject = useEditorStore((s) => s.updateCanvasObject);
  const trimClip = useEditorStore((s) => s.trimClip);

  const selectedObj = canvasObjects.find((o) => o.id === selectedObjectId);
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const clipTrack = selectedClip ? tracks.find((t) => t.id === selectedClip.trackId) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-[var(--ed-border-subtle)] bg-[var(--ed-surface)] ed-scrollbar"
      >
        <div className="border-b border-[var(--ed-border-subtle)] px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ed-text-muted)]">Inspector</span>
        </div>

        {selectedObj ? (
          <>
            <Section title="Transform">
              <div className="grid grid-cols-2 gap-2">
                <FieldRow label="X"><NumInput value={selectedObj.x} onChange={(v) => updateCanvasObject(selectedObj.id, { x: v })} /></FieldRow>
                <FieldRow label="Y"><NumInput value={selectedObj.y} onChange={(v) => updateCanvasObject(selectedObj.id, { y: v })} /></FieldRow>
                <FieldRow label="W"><NumInput value={selectedObj.width} onChange={(v) => updateCanvasObject(selectedObj.id, { width: v })} /></FieldRow>
                <FieldRow label="H"><NumInput value={selectedObj.height} onChange={(v) => updateCanvasObject(selectedObj.id, { height: v })} /></FieldRow>
              </div>
              <FieldRow label="Rotation"><NumInput value={selectedObj.rotation} onChange={(v) => updateCanvasObject(selectedObj.id, { rotation: v })} suffix="°" /></FieldRow>
              <FieldRow label="Opacity">
                <input type="range" min={0} max={1} step={0.01} value={selectedObj.opacity} onChange={(e) => updateCanvasObject(selectedObj.id, { opacity: Number(e.target.value) })} className="w-20 accent-[var(--ed-accent)]" />
              </FieldRow>
            </Section>
            <Section title="Style">
              <FieldRow label="Fill">
                <input type="color" defaultValue="#2f3f75" className="h-7 w-10 cursor-pointer rounded border border-[var(--ed-border-subtle)] bg-transparent" />
              </FieldRow>
              <FieldRow label="Radius"><NumInput value={6} onChange={() => {}} suffix="px" /></FieldRow>
            </Section>
            <Section title="Animation" defaultOpen={false}>
              <FieldRow label="Entrance">
                <select className="h-7 rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] px-2 text-xs text-[var(--ed-text-primary)]">
                  <option>None</option><option>Fade In</option><option>Slide Up</option><option>Scale In</option>
                </select>
              </FieldRow>
              <FieldRow label="Exit">
                <select className="h-7 rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] px-2 text-xs text-[var(--ed-text-primary)]">
                  <option>None</option><option>Fade Out</option><option>Slide Down</option><option>Scale Out</option>
                </select>
              </FieldRow>
            </Section>
          </>
        ) : selectedClip ? (
          <>
            <Section title="Timing">
              <FieldRow label="Start">
                <NumInput value={Number(selectedClip.startTime.toFixed(1))} step={0.1} onChange={(v) => trimClip(selectedClip.id, selectedClip.duration, v)} suffix="s" />
              </FieldRow>
              <FieldRow label="Duration">
                <NumInput value={Number(selectedClip.duration.toFixed(1))} step={0.1} onChange={(v) => trimClip(selectedClip.id, v)} suffix="s" />
              </FieldRow>
              <FieldRow label="Track">
                <span className="rounded-[var(--ed-radius-sm)] bg-[var(--ed-surface-muted)] px-2 py-1 text-xs text-[var(--ed-text-secondary)]">{clipTrack?.label ?? "—"}</span>
              </FieldRow>
            </Section>
            <Section title="Properties">
              <FieldRow label="Title">
                <span className="truncate text-xs text-[var(--ed-text-primary)]">{selectedClip.title}</span>
              </FieldRow>
              <FieldRow label="Type">
                <span className="rounded bg-[var(--ed-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--ed-accent)]">{selectedClip.type}</span>
              </FieldRow>
            </Section>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <Layers className="h-8 w-8 text-[var(--ed-text-muted)]" />
            <p className="text-xs leading-relaxed text-[var(--ed-text-muted)]">
              Select an element on the canvas or a clip on the timeline to inspect its properties.
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
