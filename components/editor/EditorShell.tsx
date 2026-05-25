"use client";

import { useEffect, useCallback, useMemo, useRef } from "react";
import { useEditorStore } from "@/lib/editor/editor-store";
import TopBar from "./TopBar";
import LeftDock from "./LeftDock";
import AssetPanel from "./AssetPanel";
import CanvasStage from "./CanvasStage";
import RightInspector from "./RightInspector";
import Timeline from "./timeline/Timeline";
import ExportModal from "./ExportModal";

export default function EditorShell() {
  const isAssetPanelOpen = useEditorStore((s) => s.isAssetPanelOpen);
  const isInspectorOpen = useEditorStore((s) => s.isInspectorOpen);
  const isTimelineCollapsed = useEditorStore((s) => s.isTimelineCollapsed);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const splitClipAtPlayhead = useEditorStore((s) => s.splitClipAtPlayhead);
  const removeClip = useEditorStore((s) => s.removeClip);
  const removeCanvasObject = useEditorStore((s) => s.removeCanvasObject);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);

  const isPlaying = useEditorStore((s) => s.isPlaying);
  const playhead = useEditorStore((s) => s.playhead);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const clips = useEditorStore((s) => s.clips);

  const lastSpokenClipIdRef = useRef<string | null>(null);

  const totalDuration = useMemo(() => {
    const maxEnd = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    return Math.max(30, maxEnd + 5);
  }, [clips]);

  // 1. Playhead Advancement Ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const next = playhead + 0.1;
        if (next >= totalDuration) {
          setPlayhead(0);
          togglePlay(); // pause
        } else {
          setPlayhead(Number(next.toFixed(1)));
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playhead, totalDuration, setPlayhead, togglePlay]);

  // 2. Playback Voiceover Text-To-Speech Synthesis Engine
  useEffect(() => {
    if (!isPlaying) {
      window.speechSynthesis.cancel();
      lastSpokenClipIdRef.current = null;
      return;
    }

    const activeAudioClip = clips.find(
      (c) =>
        c.type === "audio" &&
        playhead >= c.startTime &&
        playhead < c.startTime + c.duration
    );

    if (activeAudioClip) {
      if (lastSpokenClipIdRef.current !== activeAudioClip.id) {
        window.speechSynthesis.cancel();
        
        // Clean text (remove 'VO:' prefix)
        const rawText = activeAudioClip.title;
        const speechText = rawText.startsWith("VO:") ? rawText.slice(3).trim() : rawText;
        
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = 1.1; // slightly faster for modern pacing
        window.speechSynthesis.speak(utterance);
        
        lastSpokenClipIdRef.current = activeAudioClip.id;
      }
    } else {
      lastSpokenClipIdRef.current = null;
    }
  }, [isPlaying, playhead, clips]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClipId) removeClip(selectedClipId);
        else if (selectedObjectId) removeCanvasObject(selectedObjectId);
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      } else if (e.key === "s" && !(e.metaKey || e.ctrlKey)) {
        splitClipAtPlayhead();
      }
    },
    [togglePlay, splitClipAtPlayhead, removeClip, removeCanvasObject, selectedClipId, selectedObjectId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftDock />
        {isAssetPanelOpen && <AssetPanel />}
        <CanvasStage />
        {isInspectorOpen && <RightInspector />}
      </div>
      {!isTimelineCollapsed && <Timeline />}
      <ExportModal />
    </div>
  );
}
