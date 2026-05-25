"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/editor-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, CheckSquare, RefreshCw } from "lucide-react";
import type { CardDetail } from "@/lib/data/repository";

export default function SyncPanel() {
  const projectId = useEditorStore((s) => s.projectId);
  const addClip = useEditorStore((s) => s.addClip);
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);

  const [card, setCard] = useState<CardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCardData = useCallback(async () => {
    if (!projectId || projectId === "new") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cards/${projectId}`);
      if (!response.ok) throw new Error("Failed to load project details.");
      const data = await response.json();
      setCard(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to sync project assets.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!projectId || projectId === "new") {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/cards/${projectId}`);
        if (!response.ok) throw new Error("Failed to load project details.");
        const data = await response.json();
        if (active) {
          setCard(data);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (active) setError("Unable to sync project assets.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [projectId]);

  if (projectId === "new" || !projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-xs text-[var(--ed-text-muted)] font-mono uppercase">Blank Project</p>
        <p className="text-[10px] text-[var(--ed-text-muted)] mt-2 max-w-[200px]">
          Create this project from the Dashboard or Inbox to link planning assets.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--ed-accent)]" />
        <p className="text-[10px] text-[var(--ed-text-muted)] font-mono uppercase">Syncing with SceneBook...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-red-400 font-mono">{error ?? "Project not linked."}</p>
        <Button onClick={fetchCardData} className="mt-3 h-7 text-[10px] uppercase font-mono bg-white/5 border border-border">
          Retry Sync
        </Button>
      </div>
    );
  }

  const handleAddTextHook = (hookText: string) => {
    if (!hookText.trim()) return;
    // Add text clip to the text track (track-text)
    addClip("track-text", "text", "Hook Overlay", 5);
    addCanvasObject("text", hookText);
  };

  const handleAddAudioVoiceover = (voText: string) => {
    if (!voText.trim()) return;
    // Add voiceover clip to the audio track (track-a1)
    // We append the VO script as the clip title/descriptor.
    addClip("track-a1", "audio", `VO: ${voText.slice(0, 20)}...`, 8);
  };

  const handleAddVideoPlaceholder = (title: string) => {
    // Add video placeholder clip to the video track (track-v1)
    addClip("track-v1", "video", title, 6);
    addCanvasObject("video", title);
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="flex items-center justify-between border-b border-[var(--ed-border-subtle)] pb-2">
        <span className="text-[9px] font-mono text-[var(--ed-text-muted)] uppercase tracking-wider">Synced Workspace Hub</span>
        <button onClick={fetchCardData} className="p-1 hover:bg-white/5 rounded text-[var(--ed-text-muted)] hover:text-foreground transition cursor-pointer">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Script Section */}
      <div className="space-y-2">
        <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--ed-text-muted)]">Script Clips</p>
        {card.scriptLab.hook && (
          <div className="bg-[var(--ed-surface-muted)] border border-[var(--ed-border-subtle)] rounded-lg p-2.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--ed-accent)]">Hook text</span>
              <button
                onClick={() => handleAddTextHook(card.scriptLab.hook)}
                className="h-5 px-2 text-[9px] bg-[var(--ed-accent-soft)] hover:bg-[var(--ed-accent-soft)]/80 text-[var(--ed-accent)] rounded border border-[var(--ed-accent)]/20 cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-2.5 w-2.5" /> add
              </button>
            </div>
            <p className="text-[10px] text-[var(--ed-text-secondary)] italic leading-normal">
              &quot;{card.scriptLab.hook}&quot;
            </p>
          </div>
        )}

        {card.scriptLab.script && (
          <div className="bg-[var(--ed-surface-muted)] border border-[var(--ed-border-subtle)] rounded-lg p-2.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--ed-accent)]">Spoken script</span>
              <button
                onClick={() => handleAddAudioVoiceover(card.scriptLab.script)}
                className="h-5 px-2 text-[9px] bg-[var(--ed-accent-soft)] hover:bg-[var(--ed-accent-soft)]/80 text-[var(--ed-accent)] rounded border border-[var(--ed-accent)]/20 cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-2.5 w-2.5" /> add VO
              </button>
            </div>
            <p className="text-[10px] text-[var(--ed-text-secondary)] italic leading-normal line-clamp-3">
              &quot;{card.scriptLab.script}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Checklist section */}
      {card.shootPack.aRoll.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--ed-text-muted)]">Checklist Items</p>
          <div className="bg-[var(--ed-surface-muted)] border border-[var(--ed-border-subtle)] rounded-lg p-2 max-h-[160px] overflow-y-auto ed-scrollbar space-y-1.5">
            {card.shootPack.aRoll.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 py-0.5 border-b border-white/[0.02] last:border-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckSquare className={`h-3 w-3 shrink-0 ${task.done ? "text-emerald-400" : "text-[var(--ed-text-muted)]"}`} />
                  <span className={`text-[10px] truncate ${task.done ? "line-through text-[var(--ed-text-muted)]" : "text-[var(--ed-text-secondary)]"}`}>
                    {task.label}
                  </span>
                </div>
                <button
                  onClick={() => handleAddVideoPlaceholder(`Shot: ${task.label}`)}
                  className="h-4 px-1.5 text-[8px] bg-white/5 hover:bg-white/10 text-[var(--ed-text-secondary)] rounded border border-[var(--ed-border)] cursor-pointer"
                >
                  place
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Generated Assets sync */}
      <div className="space-y-2">
        <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--ed-text-muted)]">AI Studio Assets ({card.assets.length})</p>
        <div className="space-y-2 max-h-[220px] overflow-y-auto ed-scrollbar pr-0.5">
          {card.assets.map((asset) => (
            <div key={asset.id} className="bg-[var(--ed-surface-muted)] border border-[var(--ed-border-subtle)] rounded-lg p-2.5 space-y-2 hover:border-[var(--ed-accent)]/20 transition">
              <div className="flex justify-between items-start gap-1">
                <span className="text-[9px] font-mono text-[var(--ed-text-secondary)] truncate font-semibold">
                  {asset.title}
                </span>
                <Badge className="text-[7px] font-mono uppercase bg-white/5 text-[var(--ed-text-muted)] border border-[var(--ed-border)] px-1 py-0 shrink-0">
                  {asset.type}
                </Badge>
              </div>

              {asset.note && (
                <p className="text-[9px] text-[var(--ed-text-muted)] line-clamp-2 bg-black/10 p-1 rounded font-mono leading-normal">
                  {asset.note}
                </p>
              )}

              <div className="flex justify-end gap-1.5 pt-0.5">
                {asset.type === "document" && (
                  <Button
                    onClick={() => handleAddTextHook(asset.note || asset.title)}
                    className="h-5 px-2 text-[9px] font-mono uppercase bg-[var(--ed-accent-soft)] text-[var(--ed-accent)] cursor-pointer"
                  >
                    Add Text
                  </Button>
                )}
                {asset.type === "video" && (
                  <Button
                    onClick={() => handleAddVideoPlaceholder(asset.title)}
                    className="h-5 px-2 text-[9px] font-mono uppercase bg-[var(--ed-accent-soft)] text-[var(--ed-accent)] cursor-pointer"
                  >
                    Add B-Roll
                  </Button>
                )}
                {asset.type === "audio" && (
                  <Button
                    onClick={() => handleAddAudioVoiceover(asset.note || asset.title)}
                    className="h-5 px-2 text-[9px] font-mono uppercase bg-[var(--ed-accent-soft)] text-[var(--ed-accent)] cursor-pointer"
                  >
                    Add Audio
                  </Button>
                )}
                {(asset.type === "image" || asset.type === "thumbnail") && (
                  <Button
                    onClick={() => {
                      addClip("track-v1", "image", asset.title, 5);
                      addCanvasObject("image", asset.title);
                    }}
                    className="h-5 px-2 text-[9px] font-mono uppercase bg-[var(--ed-accent-soft)] text-[var(--ed-accent)] cursor-pointer"
                  >
                    Add Canvas
                  </Button>
                )}
              </div>
            </div>
          ))}

          {card.assets.length === 0 && (
            <div className="text-center py-6 border border-dashed border-[var(--ed-border)] rounded-lg text-[9px] text-[var(--ed-text-muted)]">
              No planning assets synchronized.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
