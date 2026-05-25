/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
"use client";


import { useMemo, useState, useRef, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart2,
  CheckSquare,
  FileText,
  Film,
  Languages,
  Pause,
  Play,
  Plus,
  Scissors,
  Sliders,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Video,
  Volume2,
  Loader2,
  KanbanSquare,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { CustomSelect } from "@/components/ui/custom-select";
import { Textarea } from "@/components/ui/textarea";
import { useCardDetail } from "@/components/workspace/hooks";
import { CreatorProgress } from "@/components/workspace/creator-progress";
import { statusLabels } from "@/lib/domain/content";
import { fetchJson } from "@/lib/fetcher";
import type { CardDetail } from "@/lib/data/repository";
import type { CardAsset } from "@/lib/types";
import { WebGLPreview, type VideoFilterType } from "@/components/workspace/webgl-preview";

type EditorAsset = CardAsset & {
  duration: number;
  track: "V1" | "V2" | "A1";
};

const fallbackAssets: EditorAsset[] = [
  {
    id: "fallback-video-1",
    cardId: "fallback",
    title: "Intro Hook.mp4",
    type: "video",
    url: "/media/sample-reel.mp4",
    note: "Cold open with the camera reveal.",
    duration: 11,
    track: "V1",
  },
  {
    id: "fallback-image-1",
    cardId: "fallback",
    title: "Lighting Grid.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
    note: "Use as the still reference for the desk breakdown.",
    duration: 7,
    track: "V2",
  },
  {
    id: "fallback-audio-1",
    cardId: "fallback",
    title: "Narration Bed.wav",
    type: "audio",
    url: "/media/sample-reel.mp4",
    note: "Placeholder audio bed for pacing.",
    duration: 18,
    track: "A1",
  },
];

interface Subtitle {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

const defaultSubtitles: Subtitle[] = [
  { id: "sub-1", start: 0.0, end: 3.2, text: "Hey everyone! Today we're adjusting our talking-head setup." },
  { id: "sub-2", start: 3.2, end: 7.0, text: "We are fixing the muddy footage colors on the Sony A7IV." },
  { id: "sub-3", start: 7.0, end: 11.5, text: "With these three simple menu settings, it looks cinematic." },
  { id: "sub-4", start: 11.5, end: 16.0, text: "Let's check the details: PP8, Zebras, and warm key lighting." },
];

function deriveEditorAssets(assets: CardAsset[]): EditorAsset[] {
  if (!assets.length) {
    return fallbackAssets;
  }

  const mapped = assets.map<EditorAsset>((asset, index) => ({
    ...asset,
    duration: asset.type === "video" ? 12 : asset.type === "audio" ? 18 : 6,
    track: index % 3 === 0 ? "V1" : index % 3 === 1 ? "V2" : "A1",
  }));

  const hasPreviewableMedia = mapped.some(
    (asset) => asset.type === "video" || asset.type === "image" || asset.type === "audio",
  );

  return hasPreviewableMedia ? mapped : [fallbackAssets[0], ...mapped];
}

let timelineIdCounter = 0;
function getNextTimelineId() {
  timelineIdCounter += 1;
  return `timeline-hub-${timelineIdCounter}`;
}

function createChecklistItem(label: string) {
  return {
    id: crypto.randomUUID(),
    label,
    done: false,
  };
}

function syncLocalCard(
  card: CardDetail,
  patch: Partial<
    Omit<CardDetail, "scriptLab" | "shootPack" | "analyticsJournal" | "aiSuggestions">
  > & {
    scriptLab?: Partial<CardDetail["scriptLab"]>;
    shootPack?: Partial<CardDetail["shootPack"]>;
    analyticsJournal?: Partial<CardDetail["analyticsJournal"]>;
    aiSuggestions?: Partial<CardDetail["aiSuggestions"]>;
  },
): CardDetail {
  return {
    ...card,
    ...patch,
    scriptLab: patch.scriptLab ? { ...card.scriptLab, ...patch.scriptLab } : card.scriptLab,
    shootPack: patch.shootPack ? { ...card.shootPack, ...patch.shootPack } : card.shootPack,
    analyticsJournal: patch.analyticsJournal
      ? { ...card.analyticsJournal, ...patch.analyticsJournal }
      : card.analyticsJournal,
    aiSuggestions: patch.aiSuggestions
      ? { ...card.aiSuggestions, ...patch.aiSuggestions }
      : card.aiSuggestions,
  };
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { card, error, isLoading, refresh, setCard } = useCardDetail(params.id);

  // Tab & Dock States
  const [activeTab, setActiveTab] = useState<"docs" | "tasks" | "studio" | "analytics">("docs");
  const [activeDockTab, setActiveDockTab] = useState<"media" | "text" | "shaders" | "captions" | "ai">("media");

  // Local Form States
  const [newARollItem, setNewARollItem] = useState("");
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportResolution, setExportResolution] = useState("1080p");
  const [exportFramerate, setExportFramerate] = useState("30");

  // Notion-Style Editor & Tasks States
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [aiGeneratingField, setAiGeneratingField] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [taskViewMode, setTaskViewMode] = useState<"list" | "board">("list");
  const [inProgressTaskIds, setInProgressTaskIds] = useState<string[]>([]);
  const [activeAiPopover, setActiveAiPopover] = useState<string | null>(null);
  const [isNavigatingToEditor, setIsNavigatingToEditor] = useState(false);

  // Mini AI Playground states
  const [miniPlaygroundOpenField, setMiniPlaygroundOpenField] = useState<string | null>(null);
  const [miniPlaygroundHistory, setMiniPlaygroundHistory] = useState<Record<string, ChatMessage[]>>({});
  const [miniPlaygroundInput, setMiniPlaygroundInput] = useState<Record<string, string>>({});
  const [miniPlaygroundGenerating, setMiniPlaygroundGenerating] = useState<Record<string, boolean>>({});
  const [miniPlaygroundModel, setMiniPlaygroundModel] = useState<Record<string, string>>({});

  // Sync draft values
  useEffect(() => {
    if (card) {
      setDraftValues({
        hook: card.scriptLab.hook || "",
        angle: card.scriptLab.angle || "",
        outline: card.scriptLab.outline || "",
        script: card.scriptLab.script || "",
        caption: card.scriptLab.caption || "",
        onScreenText: card.scriptLab.onScreenText || "",
        cta: card.scriptLab.cta || "",
        notes: card.scriptLab.notes || "",
      });
    }
  }, [card]);

  // Transition
  const [isPending, startTransition] = useTransition();

  // SceneStudio Tab Local States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  const [clips, setClips] = useState<EditorAsset[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [prevCardId, setPrevCardId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [volume, setVolume] = useState(85);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<VideoFilterType>("none");

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isSubtitlesGenerated, setIsSubtitlesGenerated] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Sync Studio Clips state during render
  if (card && card.id !== prevCardId) {
    setPrevCardId(card.id);
    setClips(deriveEditorAssets(card.assets));
    setInitialized(true);
  } else if (!card && !initialized && clips.length === 0) {
    setClips(fallbackAssets);
    setInitialized(true);
  }

  // Hash route sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      setTimeout(() => {
        if (hash === "#studio") {
          setActiveTab("studio");
        } else if (hash === "#tasks") {
          setActiveTab("tasks");
        } else if (hash === "#analytics") {
          setActiveTab("analytics");
        }
      }, 0);
    }
  }, []);

  // Derive timeline duration
  const totalDuration = useMemo(() => {
    const tracks = ["V1", "V2", "A1"] as const;
    let maxLen = 24;
    tracks.forEach((track) => {
      const trackClips = clips.filter((c) => c.track === track);
      const trackLen = trackClips.reduce((sum, c) => sum + c.duration, 0);
      if (trackLen > maxLen) {
        maxLen = trackLen;
      }
    });
    return maxLen;
  }, [clips]);

  // Sync video time with playhead
  useEffect(() => {
    let animationFrameId: number;

    const updateTimer = () => {
      if (!isPlaying || activeTab !== "studio") {
        return;
      }
      setPlayhead((current) => {
        const next = current + 0.1;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      animationFrameId = window.requestAnimationFrame(updateTimer);
    };

    if (isPlaying && activeTab === "studio") {
      animationFrameId = window.requestAnimationFrame(updateTimer);
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, totalDuration, activeTab]);

  // Derived selected clip
  const selectedClip = useMemo(() => {
    return clips.find((c) => c.id === selectedClipId) || null;
  }, [clips, selectedClipId]);

  // Synchronize playing elements
  useEffect(() => {
    if (!videoRef.current || activeTab !== "studio") return;
    videoRef.current.volume = volume / 100;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, playhead, selectedClip, clips, volume, activeTab]);

  const currentSubtitle = useMemo(() => {
    return subtitles.find((sub) => playhead >= sub.start && playhead <= sub.end) || null;
  }, [subtitles, playhead]);



  const canSaveAnalytics = useMemo(
    () => Boolean(card?.analyticsJournal.followUpIdea.trim()),
    [card?.analyticsJournal.followUpIdea],
  );

  if (isLoading) {
    return <Panel>Loading content card...</Panel>;
  }

  if (error || !card) {
    return <Panel>{error ?? "Card not found."}</Panel>;
  }

  const savePatch = async (patch: Record<string, unknown>) => {
    const next = await fetchJson<CardDetail>(`/api/cards/${card.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setCard(next);
  };

  const handleBlurBlock = async (field: string, value: string) => {
    if (card.scriptLab[field as keyof typeof card.scriptLab] === value) return;
    setSavingField(field);
    try {
      const updatedScriptLab = { ...card.scriptLab, [field]: value };
      await savePatch({ scriptLab: updatedScriptLab });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingField(null);
    }
  };

  const handleAiGenerateAsset = async (type: "hook" | "b-roll" | "voiceover" | "thumbnail", targetField?: string) => {
    if (targetField) setAiGeneratingField(targetField);
    try {
      const updated = await fetchJson<CardDetail>(`/api/cards/${card.id}/generate-asset`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      setCard(updated);
    } catch (err) {
      console.error(err);
      alert("AI generation failed. Please try again.");
    } finally {
      if (targetField) setAiGeneratingField(null);
      setActiveAiPopover(null);
    }
  };

  const handleSendMiniPrompt = async (field: string) => {
    const promptText = miniPlaygroundInput[field] || "";
    if (!promptText.trim()) return;

    // Clear input
    setMiniPlaygroundInput((prev) => ({ ...prev, [field]: "" }));
    
    // Add user message
    const userMsg: ChatMessage = { role: "user", content: promptText };
    setMiniPlaygroundHistory((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), userMsg],
    }));

    setMiniPlaygroundGenerating((prev) => ({ ...prev, [field]: true }));

    try {
      const selectedModel = miniPlaygroundModel[field] || "gemini-2.5-flash";
      const systemPresets = {
        angle: "You are a creative director. Suggest angles and core concept enhancements for the video.",
        hook: "You are a viral hook writer. Generate attention-grabbing cold opens under 15 words.",
        outline: "You are a creative director. Structure visual outline beats and visual direction.",
        script: "You are a scriptwriter. Write engaging voiceover narration alongside visual cues.",
        caption: "You are a social media manager. Generate viral captions, hashtags, and tags.",
        onScreenText: "Suggest visual text overlays to put on screen to emphasize points.",
        cta: "Write strong, action-oriented call to actions (CTAs).",
        notes: "Suggest director notes, lighting cues, camera lenses, and settings.",
      };
      
      const systemInstruction = systemPresets[field as keyof typeof systemPresets] || "You are a helpful creative writing assistant.";

      const res = await fetchJson<{ text: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          prompt: promptText,
          systemInstruction,
          modelOverride: selectedModel,
        }),
      });

      const aiMsg: ChatMessage = { role: "ai", content: res.text };
      setMiniPlaygroundHistory((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), aiMsg],
      }));
    } catch {
      const errorMsg: ChatMessage = { role: "ai", content: "Error: Generation failed. Please verify API keys in settings." };
      setMiniPlaygroundHistory((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), errorMsg],
      }));
    } finally {
      setMiniPlaygroundGenerating((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleApplyMiniText = async (field: string, text: string) => {
    setDraftValues((prev) => ({ ...prev, [field]: text }));
    setSavingField(field);
    try {
      const updatedScriptLab = { ...card.scriptLab, [field]: text };
      await savePatch({ scriptLab: updatedScriptLab });
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveMiniAsset = async (field: string, text: string) => {
    try {
      await fetchJson(`/api/cards/${card.id}/assets`, {
        method: "POST",
        body: JSON.stringify({
          title: `AI Suggestion (${field.toUpperCase()})`,
          url: "text-overlay-placeholder",
          type: "document",
          note: text,
        }),
      });
      alert("Successfully linked AI suggestion as a card asset!");
      refresh();
    } catch (err) {
      alert("Failed to link asset: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const updateTasksAndSave = async (newARoll: typeof card.shootPack.aRoll) => {
    const updatedShootPack = { ...card.shootPack, aRoll: newARoll };
    setCard(syncLocalCard(card, { shootPack: updatedShootPack }));
    try {
      await savePatch({ shootPack: updatedShootPack });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = (itemId: string, done: boolean) => {
    if (done) {
      setInProgressTaskIds((prev) => prev.filter((id) => id !== itemId));
    }
    const newARoll = card.shootPack.aRoll.map((item) =>
      item.id === itemId ? { ...item, done } : item
    );
    updateTasksAndSave(newARoll);
  };

  const handleMoveToTodo = (itemId: string) => {
    setInProgressTaskIds((prev) => prev.filter((id) => id !== itemId));
    const newARoll = card.shootPack.aRoll.map((item) =>
      item.id === itemId ? { ...item, done: false } : item
    );
    updateTasksAndSave(newARoll);
  };

  const handleMoveToInProgress = (itemId: string) => {
    setInProgressTaskIds((prev) => {
      if (!prev.includes(itemId)) return [...prev, itemId];
      return prev;
    });
    const newARoll = card.shootPack.aRoll.map((item) =>
      item.id === itemId ? { ...item, done: false } : item
    );
    updateTasksAndSave(newARoll);
  };

  const handleMoveToDone = (itemId: string) => {
    setInProgressTaskIds((prev) => prev.filter((id) => id !== itemId));
    const newARoll = card.shootPack.aRoll.map((item) =>
      item.id === itemId ? { ...item, done: true } : item
    );
    updateTasksAndSave(newARoll);
  };

  // Timeline Handlers
  const handleAddMedia = (asset: CardAsset) => {
    const nextId = getNextTimelineId();
    const newClip: EditorAsset = {
      ...asset,
      id: nextId,
      duration: asset.type === "video" ? 11 : asset.type === "audio" ? 15 : 6,
      track: asset.type === "audio" ? "A1" : "V1",
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(nextId);
  };

  const handleDeleteClip = (clipId: string) => {
    if (clips.length <= 1) return;
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    setSelectedClipId(null);
  };

  const handleSplitClip = () => {
    const tracks = ["V1", "V2", "A1"] as const;
    let splitOccurred = false;

    setClips((prevClips) => {
      const nextClips: EditorAsset[] = [];
      tracks.forEach((track) => {
        const trackClips = prevClips.filter((c) => c.track === track);
        let offset = 0;

        trackClips.forEach((clip) => {
          const clipStart = offset;
          const clipEnd = offset + clip.duration;

          if (playhead > clipStart && playhead < clipEnd && !splitOccurred) {
            splitOccurred = true;
            const splitOffset = playhead - clipStart;

            const clipPartA: EditorAsset = {
              ...clip,
              id: `${clip.id}-a`,
              title: `${clip.title} (P1)`,
              duration: Number(splitOffset.toFixed(1)),
            };

            const clipPartB: EditorAsset = {
              ...clip,
              id: `${clip.id}-b`,
              title: `${clip.title} (P2)`,
              duration: Number((clip.duration - splitOffset).toFixed(1)),
            };

            nextClips.push(clipPartA, clipPartB);
          } else {
            nextClips.push(clip);
          }
          offset += clip.duration;
        });
      });

      return splitOccurred ? nextClips : prevClips;
    });
  };

  const handleTranscribe = () => {
    setIsTranscribing(true);
    setTranscriptionProgress(0);

    const interval = setInterval(() => {
      setTranscriptionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTranscribing(false);
          setIsSubtitlesGenerated(true);
          setSubtitles(defaultSubtitles);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleUpdateSubtitle = (subId: string, text: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, text } : s)),
    );
  };

  const handleAddTextClip = (type: string) => {
    const newClipId = `text-clip-${Date.now()}`;
    const newClip: EditorAsset = {
      id: newClipId,
      cardId: params.id,
      title: `${type} Overlay.txt`,
      type: "image",
      url: "text-overlay-placeholder",
      note: `AI text overlay: ${type}`,
      duration: 4,
      track: "V2",
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClipId);
  };

  const handleGenerateAIScriptText = (mode: "hooks" | "captions" | "rewrites" | "shot-list" | "follow-up") => {
    startTransition(async () => {
      const next = await fetchJson<CardDetail>(`/api/cards/${card.id}/ai`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      setCard(next);
      if (mode === "hooks" && next.aiSuggestions.hooks.length > 0) {
        const hookText = next.aiSuggestions.hooks[0];
        const newClipId = `ai-hook-clip-${Date.now()}`;
        setClips((prev) => [
          ...prev,
          {
            id: newClipId,
            cardId: params.id,
            title: "AI Hook.txt",
            type: "image",
            url: "text-overlay-placeholder",
            note: hookText,
            duration: 5,
            track: "V2",
          },
        ]);
        setSelectedClipId(newClipId);
      }
    });
  };

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            setIsExportModalOpen(false);
            alert("Video successfully exported! Saved to project library.");
          }, 600);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const renderNotionBlock = (
    field: string,
    label: string,
    placeholder: string,
    aiType?: "hook" | "b-roll" | "voiceover" | "thumbnail"
  ) => {
    const isEditing = editingField === field;
    const isSaving = savingField === field;
    const isGenerating = aiGeneratingField === field;
    const val = draftValues[field] || "";

    return (
      <div className="group relative rounded-lg p-3 hover:bg-white/[0.02] border border-transparent hover:border-border transition-all duration-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted flex items-center gap-2">
            {label}
            {isSaving && (
              <span className="inline-flex items-center gap-1 text-[9px] text-accent lowercase">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> saving...
              </span>
            )}
            {isGenerating && (
              <span className="inline-flex items-center gap-1 text-[9px] text-accent-secondary lowercase">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> generating...
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            {aiType && !isEditing && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAiPopover(activeAiPopover === field ? null : field);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-accent cursor-pointer"
                  title="AI Assist"
                >
                  <Sparkles className="h-3 w-3" />
                </button>

                <AnimatePresence>
                  {activeAiPopover === field && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 mt-1 z-50 w-44 rounded-lg border border-border bg-surface-strong p-1 shadow-lg backdrop-blur-xl font-mono text-[9px] uppercase"
                    >
                      <button
                        onClick={() => handleAiGenerateAsset(aiType, field)}
                        className="w-full text-left px-2 py-1.5 hover:bg-white/5 text-foreground rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="h-2.5 w-2.5 text-accent animate-pulse" />
                        Generate {aiType}
                      </button>
                      {aiType === "hook" && (
                        <button
                          onClick={() => handleAiGenerateAsset("voiceover", field)}
                          className="w-full text-left px-2 py-1.5 hover:bg-white/5 text-foreground rounded flex items-center gap-1.5 cursor-pointer"
                        >
                          <Volume2 className="h-2.5 w-2.5 text-accent-secondary" />
                          Gen narration
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMiniPlaygroundOpenField(miniPlaygroundOpenField === field ? null : field);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-muted hover:text-foreground cursor-pointer flex items-center gap-1"
                title="Mini AI Playground"
              >
                <MessageSquare className="h-3 w-3" />
                {miniPlaygroundHistory[field]?.length > 0 && (
                  <span className="text-[8px] bg-accent/25 text-accent px-1 rounded-full font-mono">
                    {miniPlaygroundHistory[field].length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={val}
            onChange={(e) => setDraftValues({ ...draftValues, [field]: e.target.value })}
            onBlur={() => {
              setEditingField(null);
              handleBlurBlock(field, val);
            }}
            placeholder={placeholder}
            className="w-full bg-black/25 border border-accent/20 rounded p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none min-h-[60px]"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField(field)}
            className={`text-xs text-foreground cursor-text whitespace-pre-wrap min-h-[24px] rounded px-1 py-0.5 hover:bg-white/[0.01] ${
              val ? "" : "text-muted-foreground italic font-sans"
            }`}
          >
            {val || placeholder}
          </div>
        )}

        {/* Inline Mini AI Playground Panel */}
        {miniPlaygroundOpenField === field && (
          <div className="mt-3 p-3 rounded-lg border border-border/80 bg-black/45 space-y-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-accent uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 animate-pulse" /> Mini Playground
              </span>
              <CustomSelect
                value={miniPlaygroundModel[field] || "gemini-2.5-flash"}
                onChange={(val) => setMiniPlaygroundModel(prev => ({ ...prev, [field]: val }))}
                options={[
                  { value: "gemini-2.5-flash", label: "Gemini Flash" },
                  { value: "gemini-2.5-pro", label: "Gemini Pro" },
                  { value: "meta/llama-3.1-70b-instruct", label: "Llama 70B" },
                ]}
                className="w-[120px]"
                triggerClassName="bg-black/40 border border-border/60 rounded h-6 py-0 text-[9px] px-2"
                dropdownClassName="w-[120px]"
              />
            </div>

            <div className="max-h-[160px] overflow-y-auto ed-scrollbar space-y-2.5 pr-1">
              {(miniPlaygroundHistory[field] || []).length === 0 ? (
                <p className="text-[9px] text-muted-foreground italic font-sans py-1">
                  Ask AI to refine this {label}. E.g. &apos;make it punchier&apos; or &apos;suggest 3 alternatives&apos;.
                </p>
              ) : (
                (miniPlaygroundHistory[field] || []).map((msg, idx) => (
                  <div key={idx} className={`space-y-0.5 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                    <span className="text-[7px] font-mono text-muted-foreground uppercase tracking-widest block">
                      {msg.role === "user" ? "Creator" : "AI"}
                    </span>
                    <div className={`inline-block p-2 rounded text-[11px] leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                      msg.role === "user" 
                        ? "bg-accent/10 border border-accent/20 text-foreground" 
                        : "bg-surface-contrast border border-border text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === "ai" && !msg.content.startsWith("Error:") && (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => handleApplyMiniText(field, msg.content)}
                          className="px-2 py-0.5 bg-accent/20 border border-accent/30 text-accent text-[9px] font-mono uppercase rounded hover:bg-accent/35 transition cursor-pointer"
                        >
                          Apply to Block
                        </button>
                        <button
                          onClick={() => handleSaveMiniAsset(field, msg.content)}
                          className="px-2 py-0.5 bg-black/45 border border-border text-cyan-400 text-[9px] font-mono uppercase rounded hover:bg-white/5 transition cursor-pointer"
                        >
                          Save as Asset
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {miniPlaygroundGenerating[field] && (
                <div className="flex items-center gap-1.5 text-[10px] text-accent font-mono">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={miniPlaygroundInput[field] || ""}
                onChange={(e) => setMiniPlaygroundInput(prev => ({ ...prev, [field]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSendMiniPrompt(field)}
                placeholder={`Prompt AI for this section...`}
                className="flex-1 bg-black/40 border border-border rounded px-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                disabled={miniPlaygroundGenerating[field] || !(miniPlaygroundInput[field] || "").trim()}
                onClick={() => handleSendMiniPrompt(field)}
                className="bg-accent text-accent-foreground px-3 py-1 rounded text-[11px] font-mono hover:bg-accent/90 transition cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeading
        eyebrow="Content Card"
        title={card.title}
        description="Unified Workspace Hub: Plan, Edit, Track, and Refine your content from one platform."
      />

      <CreatorProgress currentStatus={card.status} cardId={card.id} />

      {/* Tab Navigation header */}
      <div className="mb-6 mt-6 border-b border-border bg-surface-muted/40 p-1 rounded-lg flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-[0.05em] rounded-md transition ${
              activeTab === "docs" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
            type="button"
          >
            <FileText className="h-3.5 w-3.5" />
            Docs
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-[0.05em] rounded-md transition ${
              activeTab === "tasks" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
            type="button"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-[0.05em] rounded-md transition ${
              activeTab === "studio" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
            type="button"
          >
            <Film className="h-3.5 w-3.5" />
            Studio
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-[0.05em] rounded-md transition ${
              activeTab === "analytics" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
            type="button"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </button>
        </div>
        <div className="flex items-center gap-2 pr-3">
          <Badge>{statusLabels[card.status]}</Badge>
          <Badge>{card.readiness.label}</Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {/* Tab 1: Docs */}
        {activeTab === "docs" && (
          <div className="cmd-grid xl:grid-cols-[1.2fr_0.8fr] items-start gap-6 animate-[fadeIn_0.25s_ease-out]">
            {/* Left: Notion-Style Script Canvas */}
            <div className="space-y-6">
              <Panel className="border-border/80 bg-black/40 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                  <div>
                    <span className="cmd-label text-accent">Docs Canvas</span>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground mt-1">Script & Narrative Workspace</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent-secondary animate-pulse" />
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Notion Mode Active</span>
                  </div>
                </div>

                <div className="divide-y divide-border/40 space-y-4">
                  <div className="pt-2">
                    {renderNotionBlock("angle", "Angle & Core Concept", "Describe the core angle of this video...", "thumbnail")}
                  </div>
                  <div className="pt-4">
                    {renderNotionBlock("hook", "Hook (Visual & Spoken)", "What is the hook at frame 0? E.g. 'These Sony menu settings fixed my footage...'", "hook")}
                  </div>
                  <div className="pt-4">
                    {renderNotionBlock("outline", "Visual Outline & Beats", "Detail the video beats (Intro, settings details, reveal)...", "b-roll")}
                  </div>
                  <div className="pt-4">
                    {renderNotionBlock("script", "Full Narrated Script", "Write the voiceover copy and visual cues...", "voiceover")}
                  </div>
                  <div className="pt-4">
                    {renderNotionBlock("caption", "Social Caption & Copy", "Draft caption details, hashtags, platform tags...", "hook")}
                  </div>
                  <div className="pt-4">
                    {renderNotionBlock("onScreenText", "On-Screen Text Overlays", "On-screen overlays (PP8, Zebras 95+)...", "hook")}
                  </div>
                  <div className="pt-4">
                    {renderNotionBlock("cta", "Call To Action", "E.g. 'Subscribe for weekly lighting specs'...", "hook")}
                  </div>
                  <div className="pt-4 pb-2">
                    {renderNotionBlock("notes", "Director's Notes", "Director's notes, lighting grid reference...", "b-roll")}
                  </div>
                </div>
              </Panel>
            </div>

            {/* Right: AI Toolkit & Synced Assets */}
            <div className="space-y-6">
              {/* AI Toolkit */}
              <Panel className="border-accent/10 bg-accent/[0.02]">
                <p className="cmd-label text-accent mb-4 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI Studio Tools
                </p>
                <p className="text-xs text-muted mb-4 leading-relaxed">
                  Generate structural video assets using Google Gemini & NIM. These will sync directly into the editor&apos;s workspace drawer.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleAiGenerateAsset("hook")}
                    className="flex flex-col items-center justify-center p-4 h-auto text-[10px] font-mono uppercase bg-black/20 hover:bg-black/45 border border-border cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 mb-2 text-accent" />
                    Gen Hook
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleAiGenerateAsset("b-roll")}
                    className="flex flex-col items-center justify-center p-4 h-auto text-[10px] font-mono uppercase bg-black/20 hover:bg-black/45 border border-border cursor-pointer"
                  >
                    <Video className="h-4 w-4 mb-2 text-accent-secondary" />
                    Gen B-Roll
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleAiGenerateAsset("voiceover")}
                    className="flex flex-col items-center justify-center p-4 h-auto text-[10px] font-mono uppercase bg-black/20 hover:bg-black/45 border border-border cursor-pointer"
                  >
                    <Volume2 className="h-4 w-4 mb-2 text-accent" />
                    Gen Audio
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleAiGenerateAsset("thumbnail")}
                    className="flex flex-col items-center justify-center p-4 h-auto text-[10px] font-mono uppercase bg-black/20 hover:bg-black/45 border border-border cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mb-2 text-accent-secondary" />
                    Gen Thumbnail
                  </Button>
                </div>
              </Panel>

              {/* Synchronized Project Assets */}
              <Panel>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <p className="cmd-label">Synced Assets</p>
                    <h3 className="text-sm font-semibold text-foreground mt-1">Asset Library ({card.assets.length})</h3>
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {card.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative rounded-lg border border-border bg-black/30 p-3 hover:border-accent/30 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{asset.title}</p>
                          {asset.note && (
                            <p className="mt-1 text-[10px] text-muted leading-relaxed line-clamp-3 bg-black/15 p-1.5 rounded font-mono break-words">
                              {asset.note}
                            </p>
                          )}
                        </div>
                        <Badge className="shrink-0 text-[8px] tracking-wider uppercase font-mono bg-accent/10 text-accent border border-accent/20">
                          {asset.type}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {card.assets.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted border border-dashed border-border rounded-lg">
                      No assets generated yet. Use the AI Studio Tools or script canvas sparkles above to generate hooks, B-rolls, and audio narration.
                    </div>
                  )}
                </div>
              </Panel>

              {/* Readiness score */}
              <Panel className="cmd-glow bg-accent/[0.01]">
                <p className="cmd-label text-accent">Production Readiness</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-4xl font-bold tracking-tight text-foreground">{card.readiness.score}%</span>
                  <span className="text-xs text-muted uppercase font-mono">Score</span>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed">{card.readiness.label}</p>
                
                {card.readiness.missing.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border/40 pt-3">
                    <p className="text-[10px] font-mono text-muted uppercase tracking-wider">Remaining blockers</p>
                    {card.readiness.missing.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-muted">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 text-accent shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {/* Tab 2: SceneBoard Tasks */}
        {activeTab === "tasks" && (
          <div className="cmd-grid xl:grid-cols-[1.3fr_0.7fr] items-start gap-6 animate-[fadeIn_0.25s_ease-out]">
            <Panel className="space-y-6 bg-black/40 border-border/80 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <span className="cmd-label text-accent">Task Manager</span>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mt-1">Tasks</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-black/35 p-1 rounded-lg border border-border">
                  <button
                    onClick={() => setTaskViewMode("list")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      taskViewMode === "list" ? "bg-accent text-accent-foreground shadow" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <ListTodo className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    onClick={() => setTaskViewMode("board")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      taskViewMode === "board" ? "bg-accent text-accent-foreground shadow" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <KanbanSquare className="h-3.5 w-3.5" />
                    Board
                  </button>
                </div>
              </div>

              {taskViewMode === "list" ? (
                /* ── LIST VIEW ── */
                <div className="space-y-4">
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                    {card.shootPack.aRoll.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-black/20 px-4 py-3 text-sm text-foreground hover:bg-black/35 transition duration-150"
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            checked={item.done}
                            onChange={(event) => handleToggleTask(item.id, event.target.checked)}
                            type="checkbox"
                            aria-label={`Checklist ${item.label}`}
                            className="cursor-pointer accent-accent h-4 w-4 rounded border-border bg-black/30"
                          />
                          <span className={`text-xs truncate ${item.done ? "line-through text-muted" : "text-foreground"}`}>
                            {item.label}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          {inProgressTaskIds.includes(item.id) && !item.done && (
                            <Badge className="text-[8px] bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/20">
                              in progress
                            </Badge>
                          )}
                          {!item.done && (
                            <button
                              onClick={() => {
                                if (inProgressTaskIds.includes(item.id)) {
                                  handleMoveToTodo(item.id);
                                } else {
                                  handleMoveToInProgress(item.id);
                                }
                              }}
                              className="text-[9px] font-mono uppercase text-muted hover:text-foreground px-2 py-1 rounded bg-white/5 border border-border cursor-pointer"
                            >
                              {inProgressTaskIds.includes(item.id) ? "to-do" : "start"}
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const newARoll = card.shootPack.aRoll.filter(entry => entry.id !== item.id);
                              const updatedShootPack = { ...card.shootPack, aRoll: newARoll };
                              setCard(syncLocalCard(card, { shootPack: updatedShootPack }));
                              await savePatch({ shootPack: updatedShootPack });
                            }}
                            className="text-muted hover:text-danger p-1 rounded transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {card.shootPack.aRoll.length === 0 && (
                      <div className="text-center py-10 text-xs text-muted border border-dashed border-border rounded-xl">
                        No checklist items. Create one below to get started.
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button variant="secondary" className="w-full text-xs font-mono uppercase cursor-pointer" onClick={() => setNewARollItem(" ")}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add checklist task
                    </Button>

                    {newARollItem !== "" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="rounded-xl border border-border bg-black/35 p-4 mt-3"
                      >
                        <Input
                          aria-label="New A-roll item"
                          value={newARollItem}
                          onChange={(event) => setNewARollItem(event.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newARollItem.trim()) {
                              const newItem = createChecklistItem(newARollItem.trim());
                              const newARoll = [...card.shootPack.aRoll, newItem];
                              const updatedShootPack = { ...card.shootPack, aRoll: newARoll };
                              setCard(syncLocalCard(card, { shootPack: updatedShootPack }));
                              savePatch({ shootPack: updatedShootPack });
                              setNewARollItem("");
                            }
                          }}
                          placeholder="Type task details & press Enter..."
                          className="bg-black/40 border-border text-xs focus:ring-accent"
                          autoFocus
                        />
                        <div className="mt-3 flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            className="text-[10px] font-mono uppercase h-8 cursor-pointer"
                            onClick={() => setNewARollItem("")}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="text-[10px] font-mono uppercase h-8 cursor-pointer"
                            onClick={async () => {
                              if (!newARollItem.trim()) return;
                              const newItem = createChecklistItem(newARollItem.trim());
                              const newARoll = [...card.shootPack.aRoll, newItem];
                              const updatedShootPack = { ...card.shootPack, aRoll: newARoll };
                              setCard(syncLocalCard(card, { shootPack: updatedShootPack }));
                              await savePatch({ shootPack: updatedShootPack });
                              setNewARollItem("");
                            }}
                          >
                            Save task
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── KANBAN BOARD VIEW ── */
                <div className="grid grid-cols-3 gap-3">
                  {/* Column 1: To Do */}
                  <div className="space-y-3 p-2 bg-black/15 rounded-xl border border-border/40 min-h-[300px]">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                      <span className="text-[9px] font-mono uppercase text-muted tracking-wider">To Do</span>
                      <Badge className="text-[8px] bg-white/5 text-muted border border-border">
                        {card.shootPack.aRoll.filter(i => !i.done && !inProgressTaskIds.includes(i.id)).length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {card.shootPack.aRoll
                        .filter(i => !i.done && !inProgressTaskIds.includes(i.id))
                        .map(item => (
                          <motion.div
                            key={item.id}
                            layoutId={`task-${item.id}`}
                            className="bg-surface-strong border border-border p-3 rounded-lg text-xs hover:border-accent/20 cursor-pointer transition-all"
                            onClick={() => handleMoveToInProgress(item.id)}
                          >
                            <p className="text-foreground leading-relaxed">{item.label}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[8px] font-mono uppercase text-accent-secondary">click to start</span>
                              <span className="text-[8px] font-mono text-muted">ID: {item.id.slice(0, 4)}</span>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="space-y-3 p-2 bg-black/15 rounded-xl border border-border/40 min-h-[300px]">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                      <span className="text-[9px] font-mono uppercase text-accent-secondary tracking-wider">In Progress</span>
                      <Badge className="text-[8px] bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20">
                        {card.shootPack.aRoll.filter(i => !i.done && inProgressTaskIds.includes(i.id)).length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {card.shootPack.aRoll
                        .filter(i => !i.done && inProgressTaskIds.includes(i.id))
                        .map(item => (
                          <motion.div
                            key={item.id}
                            layoutId={`task-${item.id}`}
                            className="bg-surface-strong border border-accent-secondary/30 p-3 rounded-lg text-xs shadow-md shadow-accent-secondary/5 cursor-pointer"
                            onClick={() => handleMoveToDone(item.id)}
                          >
                            <p className="text-foreground leading-relaxed">{item.label}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[8px] font-mono uppercase text-success">click to complete</span>
                              <span className="text-[8px] font-mono text-muted">ID: {item.id.slice(0, 4)}</span>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>

                  {/* Column 3: Ready / Shot */}
                  <div className="space-y-3 p-2 bg-black/15 rounded-xl border border-border/40 min-h-[300px]">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                      <span className="text-[9px] font-mono uppercase text-success tracking-wider">Ready / Shot</span>
                      <Badge className="text-[8px] bg-success/10 text-success border border-success/20">
                        {card.shootPack.aRoll.filter(i => i.done).length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {card.shootPack.aRoll
                        .filter(i => i.done)
                        .map(item => (
                          <motion.div
                            key={item.id}
                            layoutId={`task-${item.id}`}
                            className="bg-surface-strong border border-success/20 p-3 rounded-lg text-xs opacity-75 line-through text-muted cursor-pointer"
                            onClick={() => handleMoveToTodo(item.id)}
                          >
                            <p className="leading-relaxed">{item.label}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[8px] font-mono uppercase text-muted">click to reset</span>
                              <span className="text-[8px] font-mono text-muted">ID: {item.id.slice(0, 4)}</span>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            <div className="space-y-6">
              <Panel>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <p className="cmd-label text-accent">Shoot Configuration</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">Location constraints</span>
                    <span className="text-xs text-foreground font-medium block mt-1.5 bg-black/25 p-3 rounded border border-border/60 leading-relaxed">
                      {card.shootPack.locationNotes || "No location constraints specified."}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">Visual Director cues</span>
                    <span className="text-xs text-foreground font-medium block mt-1.5 bg-black/25 p-3 rounded border border-border/60 leading-relaxed">
                      {card.shootPack.visualNotes || "No lighting cues specified."}
                    </span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* Tab 3: SceneStudio Video Editor */}
        {activeTab === "studio" && (
          <div className="flex flex-col h-[680px] border border-border rounded-xl bg-background overflow-hidden font-sans">
            {/* 1. Top Navigation Bar */}
            <div className="flex h-12 items-center justify-between border-b border-border bg-surface px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                  Studio / {card.title}
                </span>
                <Badge className="text-[9px] px-1.5 py-0">Drafting</Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <span>Zoom: {zoom}%</span>
                <span className="h-3 w-px bg-border mx-1" />
                <span>Active Filter: <span className="text-accent font-mono uppercase">{activeFilter}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    setIsNavigatingToEditor(true);
                    setTimeout(() => {
                      router.push(`/editor/${card.id}`);
                    }, 850);
                  }}
                  className="h-7 px-3 text-[10px] bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 font-medium border border-accent-secondary/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Immersive Editor
                </Button>
                <Button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="h-7 px-3 text-[10px] bg-accent text-accent-foreground hover:bg-accent-hover font-medium shadow-[0_0_8px_rgba(99,102,241,0.2)] cursor-pointer"
                >
                  Export Video
                </Button>
              </div>
            </div>

            {/* 2. Main Editor Body */}
            <div className="flex flex-1 min-h-0 relative">
              {/* Left Dock */}
              <div className="flex flex-col items-center gap-3 border-r border-border bg-surface-muted p-2 w-[56px] shrink-0">
                <button
                  onClick={() => setActiveDockTab("media")}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    activeDockTab === "media" ? "bg-accent/15 text-accent border border-accent/20" : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                  title="Project Media"
                  type="button"
                >
                  <Video className="h-4.5 w-4.5" />
                  <span className="text-[8px] mt-0.5 font-medium">Media</span>
                </button>
                
                <button
                  onClick={() => setActiveDockTab("text")}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    activeDockTab === "text" ? "bg-accent/15 text-accent border border-accent/20" : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                  title="Text Templates"
                  type="button"
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span className="text-[8px] mt-0.5 font-medium">Text</span>
                </button>

                <button
                  onClick={() => setActiveDockTab("shaders")}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    activeDockTab === "shaders" ? "bg-accent/15 text-accent border border-accent/20" : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                  title="Shader Filters"
                  type="button"
                >
                  <Sliders className="h-4.5 w-4.5" />
                  <span className="text-[8px] mt-0.5 font-medium">Filters</span>
                </button>

                <button
                  onClick={() => setActiveDockTab("captions")}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    activeDockTab === "captions" ? "bg-accent/15 text-accent border border-accent/20" : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                  title="Subtitles"
                  type="button"
                >
                  <Languages className="h-4.5 w-4.5" />
                  <span className="text-[8px] mt-0.5 font-medium">Captions</span>
                </button>

                <button
                  onClick={() => setActiveDockTab("ai")}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all ${
                    activeDockTab === "ai" ? "bg-accent/15 text-accent border border-accent/20" : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                  title="AI NIM Tools"
                  type="button"
                >
                  <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                  <span className="text-[8px] mt-0.5 font-medium">AI NIM</span>
                </button>
              </div>

              {/* Left Expandable Panel */}
              <div className="w-[260px] border-r border-border bg-surface flex flex-col min-h-0 shrink-0">
                {activeDockTab === "media" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                      <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Project Media</p>
                      <Badge className="bg-accent/10 text-accent hover:bg-accent/15 text-[10px]">{card.assets.length}</Badge>
                    </div>
                    <div className="p-3 border-b border-border-subtle">
                      <Input
                        placeholder="Search media bin..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-8 text-xs bg-surface-muted border-border"
                      />
                    </div>
                    <div className="scrollbar-thin flex-1 grid grid-cols-2 content-start gap-2 overflow-y-auto p-3">
                      {card.assets
                        .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
                        .map((asset) => (
                          <button
                            key={asset.id}
                            className="group relative rounded-lg border border-border bg-black/20 p-2 text-left transition hover:border-accent"
                            onClick={() => handleAddMedia(asset)}
                            type="button"
                          >
                            <div className="flex aspect-video items-center justify-center rounded bg-surface-muted">
                              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted group-hover:hidden">
                                {asset.type}
                              </span>
                              <Plus className="hidden h-4 w-4 text-accent group-hover:block" />
                            </div>
                            <p className="mt-1.5 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                              {asset.title}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {activeDockTab === "text" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="border-b border-border-subtle px-4 py-3">
                      <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Text Presets</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <button
                        onClick={() => handleAddTextClip("Heading")}
                        className="w-full text-left p-3 rounded-lg border border-border bg-surface-muted hover:border-accent hover:bg-accent/5 transition-all"
                        type="button"
                      >
                        <span className="block text-sm font-bold text-foreground">Add Heading</span>
                        <span className="block text-[10px] text-muted mt-0.5">Large bold title overlay</span>
                      </button>
                      <button
                        onClick={() => handleAddTextClip("Subheading")}
                        className="w-full text-left p-3 rounded-lg border border-border bg-surface-muted hover:border-accent hover:bg-accent/5 transition-all"
                        type="button"
                      >
                        <span className="block text-xs font-semibold text-foreground">Add Subheading</span>
                        <span className="block text-[10px] text-muted mt-0.5">Medium body overlay text</span>
                      </button>
                      <button
                        onClick={() => handleAddTextClip("Body text")}
                        className="w-full text-left p-3 rounded-lg border border-border bg-surface-muted hover:border-accent hover:bg-accent/5 transition-all"
                        type="button"
                      >
                        <span className="block text-[11px] text-foreground">Add Body Text</span>
                        <span className="block text-[10px] text-muted mt-0.5">Paragraph descriptive overlay</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeDockTab === "shaders" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="border-b border-border-subtle px-4 py-3">
                      <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Shader Filters</p>
                    </div>
                    <div className="scrollbar-thin flex-1 overflow-y-auto p-4 space-y-2.5">
                      {(["none", "warm", "glitch", "cyberpunk", "crt", "chromakey"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setActiveFilter(opt)}
                          className={`w-full rounded-lg border p-3 text-left text-xs transition flex items-center justify-between ${
                            activeFilter === opt ? "border-accent bg-accent/10 text-accent font-bold" : "border-border bg-surface-muted text-muted hover:border-white/10"
                          }`}
                          type="button"
                        >
                          <span className="font-mono uppercase">{opt} filter</span>
                          <div className={`h-2 w-2 rounded-full ${activeFilter === opt ? "bg-accent" : "bg-transparent"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeDockTab === "captions" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="border-b border-border-subtle px-4 py-3">
                      <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Subtitles (AI)</p>
                    </div>
                    <div className="p-4 border-b border-border-subtle">
                      {!isSubtitlesGenerated && !isTranscribing && (
                        <Button onClick={handleTranscribe} className="w-full justify-center text-xs">
                          <Sparkles className="h-4.5 w-4.5 mr-2" />
                          AI Auto-Subtitle
                        </Button>
                      )}
                      {isTranscribing && (
                        <div className="rounded border border-border bg-black/20 p-3 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted">Analyzing audio...</span>
                            <span className="text-accent font-mono">{transcriptionProgress}%</span>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${transcriptionProgress}%` }} />
                          </div>
                        </div>
                      )}
                      {isSubtitlesGenerated && (
                        <span className="text-[10px] text-muted">Click timing cards to jump playhead:</span>
                      )}
                    </div>
                    {isSubtitlesGenerated && (
                      <div className="scrollbar-thin flex-1 overflow-y-auto p-3 space-y-2">
                        {subtitles.map((sub) => (
                          <div
                            key={sub.id}
                            onClick={() => setPlayhead(sub.start)}
                            className={`rounded border p-2 text-left cursor-pointer transition ${
                              playhead >= sub.start && playhead <= sub.end ? "border-accent bg-accent/5" : "border-border bg-black/25"
                            }`}
                          >
                            <span className="block text-[8px] font-mono text-muted mb-1">
                              {sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s
                            </span>
                            <Input
                              value={sub.text}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateSubtitle(sub.id, e.target.value)}
                              className="bg-black/30 border-border text-[11px] px-2 py-0.5 text-foreground h-7"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDockTab === "ai" && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="border-b border-border-subtle px-4 py-3">
                      <p className="font-semibold text-xs text-foreground uppercase tracking-wider">NVIDIA NIM Assist</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <p className="text-[11px] text-muted leading-relaxed">
                        Generate script overlays, hook suggestions, and CTAs directly into your workspace.
                      </p>
                      <button
                        onClick={() => handleGenerateAIScriptText("hooks")}
                        className="w-full text-left p-3 rounded-lg border border-border bg-surface-muted hover:border-accent hover:bg-accent/5 transition flex items-center gap-2"
                        type="button"
                      >
                        <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                        <div className="text-left">
                          <span className="block text-xs font-bold text-foreground">Generate Hooks</span>
                          <span className="block text-[9px] text-muted mt-0.5">Get 3 viral intro concepts</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleGenerateAIScriptText("shot-list")}
                        className="w-full text-left p-3 rounded-lg border border-border bg-surface-muted hover:border-accent hover:bg-accent/5 transition flex items-center gap-2"
                        type="button"
                      >
                        <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                        <div className="text-left">
                          <span className="block text-xs font-bold text-foreground">Generate Shot List</span>
                          <span className="block text-[9px] text-muted mt-0.5">Outline camera directions</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Central Canvas Stage */}
              <div className="flex-1 flex flex-col bg-background/50 border-r border-border p-4 min-h-0 relative">
                {/* Stage Area */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-neutral-900/40 shadow-inner">
                  {/* WebGL Artboard with 9:16 ratio and premium drop-shadow */}
                  <div className="relative aspect-[9/16] h-[360px] max-h-full rounded-lg overflow-hidden border border-border/40 shadow-2xl bg-black">
                    {/* Hidden tag elements for WebGL feeding */}
                    <div className="hidden">
                      {selectedClip?.type === "video" || selectedClip?.type === "audio" ? (
                        <video
                          ref={(el) => {
                            videoRef.current = el;
                            setVideoElement(el);
                          }}
                          src={selectedClip.url}
                          muted={selectedClip.type === "audio"}
                          playsInline
                          loop
                        />
                      ) : (
                        <img
                          ref={(el) => {
                            imageRef.current = el;
                            setImageElement(el);
                          }}
                          src={selectedClip?.url}
                          alt="Active still"
                        />
                      )}
                    </div>

                    {selectedClip ? (
                      <WebGLPreview
                        videoElement={selectedClip.type === "video" ? videoElement : null}
                        imageElement={selectedClip.type === "image" ? imageElement : null}
                        filter={activeFilter}
                        zoom={zoom}
                        positionX={positionX}
                        positionY={positionY}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                        Empty Stage (Add media to timeline)
                      </div>
                    )}

                    {/* Captions overlay */}
                    {isSubtitlesGenerated && currentSubtitle && (
                      <div className="absolute bottom-8 left-1/2 w-4/5 -translate-x-1/2 text-center pointer-events-none z-20">
                        <p
                          className="text-xs font-bold text-accent tracking-wide px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 inline-block font-sans"
                          style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.85)" }}
                        >
                          {currentSubtitle.text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scrubber Playback Controls */}
                <div className="mt-3 flex items-center justify-between border border-border bg-surface-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      className="rounded-full border border-border p-1.5 text-muted transition hover:bg-white/5 hover:text-foreground"
                      onClick={() => setPlayhead((current) => Math.max(0, current - 1))}
                      type="button"
                    >
                      <SkipBack className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded-full border border-accent bg-accent p-2 text-accent-foreground shadow-[0_0_8px_rgba(105,104,255,0.25)]"
                      onClick={() => setIsPlaying((current) => !current)}
                      type="button"
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      className="rounded-full border border-border p-1.5 text-muted transition hover:bg-white/5 hover:text-foreground"
                      onClick={() => setPlayhead((current) => Math.min(totalDuration, current + 1))}
                      type="button"
                    >
                      <SkipForward className="h-3 w-3" />
                    </button>

                    <div className="h-4 w-px bg-border mx-2" />

                    <button
                      onClick={handleSplitClip}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[9px] font-mono text-muted hover:border-accent hover:text-accent transition"
                      type="button"
                    >
                      <Scissors className="h-2.5 w-2.5" />
                      Split
                    </button>

                    {selectedClipId && (
                      <button
                        onClick={() => handleDeleteClip(selectedClipId)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[9px] font-mono text-muted hover:border-danger hover:text-danger transition"
                        type="button"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Volume control */}
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-muted" />
                      <input
                        className="w-16 accent-[var(--accent)] cursor-pointer h-1 rounded bg-border"
                        max={100}
                        min={0}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        type="range"
                        value={volume}
                      />
                      <span className="font-mono text-[8px] text-muted">{volume}%</span>
                    </div>

                    <div className="h-4.5 w-px bg-border" />

                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                      {playhead.toFixed(1)}s / {totalDuration.toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Inspector Panel */}
              <div className="w-[280px] border-l border-border bg-surface flex flex-col min-h-0 shrink-0">
                <div className="flex border-b border-border text-center bg-surface-muted shrink-0">
                  <div className="flex-1 py-3 text-[10px] font-mono uppercase tracking-[0.05em] text-foreground font-bold border-b-2 border-accent flex items-center justify-center gap-1.5">
                    <Sliders className="h-3 w-3" />
                    Inspector
                  </div>
                </div>

                <div className="scrollbar-thin flex-1 overflow-y-auto p-4 space-y-5">
                  {selectedClip ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-1.5">
                          <p className="cmd-label text-foreground">Clip Transform</p>
                          <Badge className="text-[9px]">{selectedClip.track}</Badge>
                        </div>
                        <RangeField label={`Scale (${Math.round(zoom)}%)`} max={150} min={70} onChange={setZoom} value={zoom} />
                        <RangeField label={`Position X (${positionX.toFixed(1)})`} max={20} min={-20} onChange={setPositionX} value={positionX} />
                        <RangeField label={`Position Y (${positionY.toFixed(1)})`} max={20} min={-20} onChange={setPositionY} value={positionY} />
                      </div>

                      <div className="space-y-3 pt-3 border-t border-border">
                        <p className="cmd-label text-foreground">Clip Info & Timing</p>
                        <div className="bg-surface-muted rounded-lg border border-border p-2.5 space-y-2">
                          <div>
                            <span className="block text-[9px] text-muted uppercase">Clip Title</span>
                            <span className="block text-xs font-semibold truncate text-foreground mt-0.5">{selectedClip.title}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted uppercase">Track Placement</span>
                            <span className="block text-xs text-foreground font-medium mt-0.5">{selectedClip.track}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted uppercase">Duration (Seconds)</span>
                            <Input
                              type="number"
                              step={0.5}
                              className="bg-black/40 border-border text-xs px-2 py-1 text-foreground mt-1 h-8"
                              value={selectedClip.duration}
                              onChange={(e) => {
                                const newDur = Math.max(0.5, Number(e.target.value));
                                setClips((prev) =>
                                  prev.map((c) => (c.id === selectedClip.id ? { ...c, duration: newDur } : c)),
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <Sliders className="h-8 w-8 text-muted mb-2 opacity-40" />
                      <p className="text-xs text-muted font-mono uppercase">No Clip Selected</p>
                      <p className="text-[10px] text-muted mt-1 leading-relaxed">
                        Select any video, text, or audio clip in the timeline below to view its transform and duration settings.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Bottom Timeline Panel */}
            <div className="h-[180px] border-t border-border bg-surface flex flex-col shrink-0 min-h-0">
              {/* Timeline Header Ruler */}
              <div className="flex items-center border-b border-border bg-surface-muted text-[8px] font-mono text-muted h-7 px-3 shrink-0">
                <div className="w-[45px] font-bold text-center shrink-0 border-r border-border h-full flex items-center justify-center uppercase">Tracks</div>
                <div className="flex-1 relative h-full flex items-center px-2">
                  {/* Ruler ticks every 5s */}
                  {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => {
                    const sec = i * 5;
                    const left = (sec / totalDuration) * 100;
                    if (left > 100) return null;
                    return (
                      <div
                        key={sec}
                        className="absolute h-full flex flex-col justify-between pt-1 border-l border-border"
                        style={{ left: `${left}%` }}
                      >
                        <span className="pl-1 text-[8px] font-bold">{sec}s</span>
                        <div className="h-1.5 w-px bg-border" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scrubber slider bar overlay on tracks */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5 bg-black/10">
                <div className="relative">
                  {/* Full timeline slider element overlay */}
                  <input
                    className="absolute inset-x-[53px] top-0 bottom-0 opacity-0 z-20 cursor-col-resize w-[calc(100%-53px)]"
                    max={totalDuration}
                    min={0}
                    onChange={(event) => setPlayhead(Number(event.target.value))}
                    step={0.1}
                    type="range"
                    value={playhead}
                  />

                  {(["V2", "V1", "A1"] as const).map((track) => {
                    let offset = 0;
                    return (
                      <div key={track} className="flex items-center gap-2 h-9 relative">
                        {/* Track Label */}
                        <div className="w-[45px] shrink-0 font-mono text-[9px] uppercase text-muted font-bold text-center bg-surface-muted rounded border border-border py-1.5">
                          {track}
                        </div>

                        {/* Track Container */}
                        <div className="flex-1 relative h-9 rounded-lg border border-border bg-black/20 overflow-hidden">
                          {/* Playhead line overlay */}
                          <div
                            className="absolute inset-y-0 w-0.5 bg-accent z-10 pointer-events-none shadow-[0_0_4px_#5b5cf6]"
                            style={{ left: `${(playhead / totalDuration) * 100}%` }}
                          />
                          {clips
                            .filter((asset) => asset.track === track)
                            .map((asset) => {
                              const left = (offset / totalDuration) * 100;
                              const width = (asset.duration / totalDuration) * 100;
                              offset += asset.duration;
                              
                              // Visual track-specific coloring
                              let clipColor = "border-blue-500/30 bg-blue-500/10 text-blue-300";
                              if (track === "V2") clipColor = "border-purple-500/30 bg-purple-500/10 text-purple-300";
                              if (track === "A1") clipColor = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
                              
                              if (selectedClipId === asset.id) {
                                clipColor = "border-accent bg-accent/20 text-accent font-bold shadow-[0_0_8px_rgba(105,104,255,0.25)]";
                              }

                              return (
                                <button
                                  key={asset.id}
                                  className={`absolute top-1 bottom-1 rounded border px-2 text-left transition flex items-center justify-between ${clipColor}`}
                                  onClick={() => setSelectedClipId(asset.id)}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  type="button"
                                >
                                  <span className="block truncate font-mono text-[8px] uppercase tracking-wider">
                                    {asset.title}
                                  </span>
                                  <span className="text-[7px] font-mono opacity-65 pl-1 shrink-0">{asset.duration}s</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: SceneAnalytics */}
        {activeTab === "analytics" && (
          <div className="cmd-grid xl:grid-cols-[1.1fr_0.9fr] items-start gap-6 animate-[fadeIn_0.2s_ease-out]">
            <Panel className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <p className="cmd-label">Post-Publish Analysis</p>
                  <h3 className="text-lg font-semibold text-foreground">Release Journal</h3>
                </div>
                <Badge>{card.analyticsJournal.views ? "Live stats" : "Pending publish"}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-foreground block">
                  Total Views
                  <Input
                    className="mt-2 bg-black/20 border-border"
                    type="number"
                    value={card.analyticsJournal.views}
                    onChange={(event) =>
                      setCard(
                        syncLocalCard(card, {
                          analyticsJournal: { views: Number(event.target.value) },
                        }),
                      )
                    }
                  />
                </label>

                <label className="text-sm font-medium text-foreground block">
                  Total Likes
                  <Input
                    className="mt-2 bg-black/20 border-border"
                    type="number"
                    value={card.analyticsJournal.likes}
                    onChange={(event) =>
                      setCard(
                        syncLocalCard(card, {
                          analyticsJournal: { likes: Number(event.target.value) },
                        }),
                      )
                    }
                  />
                </label>

                <label className="text-sm font-medium text-foreground md:col-span-2 block">
                  Publish Decision
                  <CustomSelect
                    value={card.analyticsJournal.decision}
                    onChange={(val) =>
                      setCard(
                        syncLocalCard(card, {
                          analyticsJournal: {
                            decision: val as CardDetail["analyticsJournal"]["decision"],
                          },
                        }),
                      )
                    }
                    options={[
                      { value: "repeat", label: "Repeat (Highly successful, double down)" },
                      { value: "remix", label: "Remix (Interesting, needs structural tweaks)" },
                      { value: "retire", label: "Retire (Low traction, pivot angle)" },
                    ]}
                    className="mt-2"
                  />
                </label>

                <label className="text-sm font-medium text-foreground md:col-span-2 block">
                  Follow-up Script Docs / Next Idea
                  <Textarea
                    className="mt-2 min-h-24 bg-black/20 border-border"
                    placeholder="Based on viewer comments and retention graphs, next time we should..."
                    value={card.analyticsJournal.followUpIdea}
                    onChange={(event) =>
                      setCard(
                        syncLocalCard(card, {
                          analyticsJournal: { followUpIdea: event.target.value },
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <div className="border-t border-border pt-4 flex gap-2">
                <Button
                  disabled={!canSaveAnalytics || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await savePatch({
                        status: "analyzed",
                        analyticsJournal: card.analyticsJournal,
                      });
                    })
                  }
                >
                  Save Reflection & Close Loop
                </Button>
              </div>
            </Panel>

            <div className="space-y-6">
              {/* Performance highlights */}
              <Panel className="space-y-4">
                <p className="cmd-label text-foreground">Engagement Metrics</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-black/20 p-4">
                    <span className="text-xs text-muted block">Views</span>
                    <span className="text-2xl font-semibold mt-1 block">
                      {card.analyticsJournal.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-black/20 p-4">
                    <span className="text-xs text-muted block">Engagement Rate</span>
                    <span className="text-2xl font-semibold mt-1 block">
                      {card.analyticsJournal.views > 0
                        ? `${((card.analyticsJournal.likes / card.analyticsJournal.views) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </span>
                  </div>
                </div>
              </Panel>

              {/* Loop Closure explanation */}
              <Panel>
                <p className="cmd-label text-foreground mb-3">Atlassian Loop Close</p>
                <p className="text-xs text-muted leading-relaxed">
                  Analytics closings automatically mark this story as **Resolved** in the creator pipeline, feeding the follow-up capture ticket back into the **Inbox** queue.
                </p>
              </Panel>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Export Project</h3>
              {!isExporting && (
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-muted hover:text-foreground text-sm font-bold font-mono"
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
            
            {!isExporting ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="block text-muted mb-1.5 uppercase font-mono tracking-wider text-[9px]">Format</span>
                  <CustomSelect
                    value={exportFormat}
                    onChange={setExportFormat}
                    options={[
                      { value: "mp4", label: "MP4 (H.264 Codec)" },
                      { value: "webm", label: "WebM (VP9 Codec)" },
                      { value: "mov", label: "MOV (ProRes QuickTime)" },
                    ]}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-muted mb-1.5 uppercase font-mono tracking-wider text-[9px]">Resolution</span>
                    <CustomSelect
                      value={exportResolution}
                      onChange={setExportResolution}
                      options={[
                        { value: "720p", label: "720p (HD)" },
                        { value: "1080p", label: "1080p (Full HD)" },
                        { value: "4k", label: "4K (Ultra HD)" },
                      ]}
                    />
                  </div>
                  <div>
                    <span className="block text-muted mb-1.5 uppercase font-mono tracking-wider text-[9px]">Framerate</span>
                    <CustomSelect
                      value={exportFramerate}
                      onChange={setExportFramerate}
                      options={[
                        { value: "24", label: "24 FPS" },
                        { value: "30", label: "30 FPS" },
                        { value: "60", label: "60 FPS" },
                      ]}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={handleStartExport} className="w-full justify-center">
                    Render & Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-4 text-center">
                <div className="flex justify-between text-xs font-mono text-muted px-2">
                  <span>Rendering video layers...</span>
                  <span className="text-accent font-bold">{exportProgress}%</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-100" 
                    style={{ width: `${exportProgress}%` }} 
                  />
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  Exporting WebGL liquid shaders, fragment filters, and playhead-synced captions. Please keep this browser window active.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation transition overlay */}
      <AnimatePresence>
        {isNavigatingToEditor && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08080a] text-foreground"
          >
            <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(99, 102, 241, 0.15), transparent 60%) pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, rgba(99, 102, 241, 0.15), transparent 60%)" }} />
            <div className="text-center space-y-5 relative z-10">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="h-12 w-12 border-2 border-accent border-t-transparent rounded-full mx-auto shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm font-mono uppercase tracking-[0.2em] text-accent font-semibold"
              >
                Initializing Editor Deck
              </motion.p>
              <p className="text-[10px] text-muted uppercase font-mono max-w-[280px] leading-relaxed mx-auto">
                Configuring tracks and visual mood board assets for {card.title}...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RangeField({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        className="mt-1.5 w-full accent-[var(--accent)] cursor-pointer"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={0.5}
        type="range"
        value={value}
      />
    </label>
  );
}
