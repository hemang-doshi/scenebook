"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { useEditorStore } from "@/lib/editor/editor-store";
import { orderEditorAssets } from "@/lib/editor/bootstrap";
import type { CardDetail } from "@/lib/data/repository";

const EditorShell = dynamic(() => import("@/components/editor/EditorShell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ed-accent)] border-t-transparent" />
    </div>
  ),
});

export function EditorPageClient({
  cardId,
  focusedAssetId,
  initialProject,
}: {
  cardId: string;
  focusedAssetId: string | null;
  initialProject: CardDetail | null;
}) {
  const setProject = useEditorStore((s) => s.setProject);
  const addClip = useEditorStore((s) => s.addClip);
  const addCanvasObject = useEditorStore((s) => s.addCanvasObject);
  const resetEditor = useEditorStore((s) => s.resetEditor);
  const tracks = useEditorStore((s) => s.tracks);
  const [bootstrappedCardId, setBootstrappedCardId] = useState<string | null>(null);

  useEffect(() => {
    resetEditor();

    if (cardId === "new") {
      setProject("new", "Untitled Project");
      queueMicrotask(() => setBootstrappedCardId(cardId));
      return;
    }

    if (!initialProject) {
      setProject(cardId, "Untitled Project");
      queueMicrotask(() => setBootstrappedCardId(cardId));
      return;
    }

    setProject(initialProject.id, initialProject.title);

    const videoTrack = tracks.find((track) => track.type === "video");
    const audioTrack = tracks.find((track) => track.type === "audio");
    const assets = orderEditorAssets(initialProject.assets, focusedAssetId);

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

    queueMicrotask(() => setBootstrappedCardId(cardId));
  }, [
    addCanvasObject,
    addClip,
    cardId,
    focusedAssetId,
    initialProject,
    resetEditor,
    setProject,
    tracks,
  ]);

  if (bootstrappedCardId !== cardId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ed-accent)] border-t-transparent" />
          <p className="text-xs text-[var(--ed-text-muted)]">Loading editor...</p>
        </div>
      </div>
    );
  }

  return <EditorShell />;
}
