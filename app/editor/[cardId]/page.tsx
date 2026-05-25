/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useEditorStore } from "@/lib/editor/editor-store";

function EditorPageInner() {
  const params = useParams<{ cardId: string }>();
  const searchParams = useSearchParams();
  const setProject = useEditorStore((s) => s.setProject);
  const addClip = useEditorStore((s) => s.addClip);
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);
  const resetEditor = useEditorStore((s) => s.resetEditor);
  const tracks = useEditorStore((s) => s.tracks);
  const clips = useEditorStore((s) => s.clips);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!params.cardId || loaded) return;

    resetEditor();

    if (params.cardId === "new") {
      setProject("new", "Untitled Project");
      setLoaded(true);
      return;
    }

    fetch(`/api/projects/${params.cardId}`)
      .then((r) => r.json())
      .then((card) => {
        setProject(card.id, card.title);

        if (clips.length === 0 && card.assets?.length) {
          const videoTrack = tracks.find((t) => t.type === "video");
          const audioTrack = tracks.find((t) => t.type === "audio");

          const focusedAssetId = searchParams.get("asset");
          const assets = [...card.assets].sort((left: { id: string }, right: { id: string }) => {
            if (!focusedAssetId) return 0;
            if (left.id === focusedAssetId) return 1;
            if (right.id === focusedAssetId) return -1;
            return 0;
          });

          for (const asset of assets) {
            const trackId =
              asset.type === "audio"
                ? audioTrack?.id ?? tracks[0].id
                : videoTrack?.id ?? tracks[0].id;
            const clipType = asset.type === "video" ? "video" : asset.type === "audio" ? "audio" : "image";
            addClip(trackId, clipType, asset.title, asset.type === "audio" ? 15 : 8);
            if (asset.type !== "audio") {
              addCanvasObject(clipType, asset.title);
            }
          }
        }

        setLoaded(true);
      })
      .catch(() => {
        setProject(params.cardId, "Untitled Project");
        setLoaded(true);
      });
  }, [params.cardId, loaded, setProject, addClip, addCanvasObject, tracks, clips.length, searchParams, resetEditor]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ed-accent)] border-t-transparent" />
          <p className="text-xs text-[var(--ed-text-muted)]">Loading editor...</p>
        </div>
      </div>
    );
  }

  return <EditorShellLazy />;
}

function EditorShellLazy() {
  const [Shell, setShell] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("@/components/editor/EditorShell").then((mod) => {
      setShell(() => mod.default);
    });
  }, []);

  if (!Shell) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ed-accent)] border-t-transparent" />
      </div>
    );
  }

  return <Shell />;
}

export default function EditorPage() {
  return <EditorPageInner />;
}
