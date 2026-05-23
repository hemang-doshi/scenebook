"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { useCardDetail } from "@/components/workspace/hooks";
import { statusLabels } from "@/lib/domain/content";
import type { CardAsset } from "@/lib/types";

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

function deriveEditorAssets(assets: CardAsset[]) {
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

export default function StudioEditorPage() {
  const params = useParams<{ id: string }>();
  const { card, error, isLoading } = useCardDetail(params.id);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(108);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [volume, setVolume] = useState(85);
  const [search, setSearch] = useState("");

  const mediaAssets = useMemo(
    () => deriveEditorAssets(card?.assets ?? []),
    [card?.assets],
  );

  const totalDuration = useMemo(
    () => Math.max(24, mediaAssets.reduce((sum, asset) => sum + asset.duration, 0)),
    [mediaAssets],
  );

  const selectedAsset =
    mediaAssets.find((asset) => asset.id === selectedAssetId) ??
    mediaAssets[0] ??
    null;
  const activeClipId = selectedClipId ?? mediaAssets[0]?.id ?? null;

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlayhead((current) => {
        const next = current + 0.1;
        return next >= totalDuration ? 0 : next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    if (!videoRef.current || !selectedAsset || selectedAsset.type === "image") {
      return;
    }

    videoRef.current.currentTime = Math.min(playhead, Math.max(0, selectedAsset.duration - 0.2));
    videoRef.current.volume = volume / 100;

    if (isPlaying) {
      void videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, playhead, selectedAsset, volume]);

  const filteredAssets = mediaAssets.filter((asset) =>
    asset.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return <Panel>Loading studio editor...</Panel>;
  }

  if (error || !card) {
    return <Panel>{error ?? "Card not found."}</Panel>;
  }

  return (
    <div className="flex h-[calc(100vh-97px)] flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="cmd-label">Current Project</p>
          <h1 className="mt-2 text-2xl font-semibold text-accent">{card.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {statusLabels[card.status]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{card.platform}</Badge>
          <Badge>{card.format}</Badge>
          <Link href={`/cards/${card.id}`}>
            <Button variant="secondary">Back to card</Button>
          </Link>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
        <Panel className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="cmd-label text-foreground">Project Media</p>
            <Badge>{filteredAssets.length}</Badge>
          </div>
          <div className="px-4 py-3">
            <Input
              placeholder="Search project..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="scrollbar-thin grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto px-4 pb-4">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                className={`rounded-lg border p-2 text-left transition ${
                  selectedAsset?.id === asset.id
                    ? "border-accent bg-accent/8"
                    : "border-border bg-black/20 hover:border-white/25"
                }`}
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setSelectedClipId(asset.id);
                }}
                type="button"
              >
                <div className="flex aspect-video items-center justify-center rounded bg-[linear-gradient(135deg,#17171a,#0b0b0c)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {asset.type}
                  </span>
                </div>
                <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {asset.title}
                </p>
                <p className="mt-1 text-xs text-foreground">{asset.duration.toFixed(0)} sec</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Badge>Source</Badge>
              <Badge>Program</Badge>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
              {Math.round(zoom)}% preview
            </p>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto_auto] gap-4 p-4">
            <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-black">
              <div className="relative flex h-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,152,0,0.18),transparent_42%),linear-gradient(180deg,#121214_0%,#060607_100%)]">
                {selectedAsset?.type === "video" || selectedAsset?.type === "audio" ? (
                  <video
                    ref={videoRef}
                    className="max-h-full max-w-full"
                    muted={selectedAsset.type === "audio"}
                    playsInline
                    src={selectedAsset.url}
                  />
                ) : selectedAsset ? (
                  selectedAsset.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={selectedAsset.title}
                      className="max-h-full max-w-full object-contain"
                      src={selectedAsset.url}
                    />
                  ) : (
                    <div className="rounded-xl border border-border bg-black/40 p-6 text-left">
                      <p className="cmd-label">Reference asset</p>
                      <p className="mt-3 text-xl font-semibold text-foreground">
                        {selectedAsset.title}
                      </p>
                      <p className="mt-3 max-w-md break-all text-sm leading-6 text-muted">
                        {selectedAsset.url}
                      </p>
                    </div>
                  )
                ) : null}

                {card.scriptLab.hook ? (
                  <div className="pointer-events-none absolute inset-x-8 bottom-8 rounded-lg border border-white/10 bg-black/50 px-4 py-3 backdrop-blur">
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                      Hook Overlay
                    </p>
                    <p className="mt-2 text-sm text-foreground">{card.scriptLab.hook}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-black/25 px-4 py-3">
              <input
                className="w-full accent-[var(--accent)]"
                max={totalDuration}
                min={0}
                onChange={(event) => setPlayhead(Number(event.target.value))}
                step={0.1}
                type="range"
                value={playhead}
              />
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-border p-2 text-muted transition hover:bg-white/5 hover:text-foreground"
                    onClick={() => setPlayhead((current) => Math.max(0, current - 1))}
                    type="button"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-full border border-accent bg-accent p-3 text-accent-foreground"
                    onClick={() => setIsPlaying((current) => !current)}
                    type="button"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    className="rounded-full border border-border p-2 text-muted transition hover:bg-white/5 hover:text-foreground"
                    onClick={() => setPlayhead((current) => Math.min(totalDuration, current + 1))}
                    type="button"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {playhead.toFixed(1)}s / {totalDuration.toFixed(1)}s
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-black/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="cmd-label text-foreground">Timeline</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  Bars and timeline
                </p>
              </div>
              <div className="space-y-3">
                {(["V2", "V1", "A1"] as const).map((track) => {
                  let offset = 0;

                  return (
                    <div key={track} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        {track}
                      </p>
                      <div className="relative h-11 rounded-lg border border-border bg-black/20">
                        <div
                          className="absolute inset-y-0 w-px bg-accent"
                          style={{ left: `${(playhead / totalDuration) * 100}%` }}
                        />
                        {mediaAssets
                          .filter((asset) => asset.track === track)
                          .map((asset) => {
                            const left = (offset / totalDuration) * 100;
                            const width = (asset.duration / totalDuration) * 100;
                            offset += asset.duration;

                            return (
                              <button
                                key={asset.id}
                                className={`absolute top-1 bottom-1 rounded-md border px-2 text-left ${
                                  activeClipId === asset.id
                                    ? "border-accent bg-accent/15"
                                    : "border-border bg-[#141416]"
                                }`}
                                onClick={() => {
                                  setSelectedClipId(asset.id);
                                  setSelectedAssetId(asset.id);
                                }}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                type="button"
                              >
                                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-foreground">
                                  {asset.title}
                                </span>
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
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="cmd-label text-foreground">Inspector</p>
          </div>
          <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <section>
              <p className="cmd-label">Transform</p>
              <div className="mt-3 space-y-4">
                <RangeField
                  label={`Scale ${Math.round(zoom)}%`}
                  max={140}
                  min={80}
                  onChange={setZoom}
                  value={zoom}
                />
                <RangeField
                  label={`Position X ${positionX.toFixed(1)}`}
                  max={20}
                  min={-20}
                  onChange={setPositionX}
                  value={positionX}
                />
                <RangeField
                  label={`Position Y ${positionY.toFixed(1)}`}
                  max={20}
                  min={-20}
                  onChange={setPositionY}
                  value={positionY}
                />
              </div>
            </section>

            <section>
              <p className="cmd-label">Audio</p>
              <div className="mt-3 rounded-lg border border-border bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-muted">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">Master level {volume}%</span>
                </div>
                <input
                  className="w-full accent-[var(--accent)]"
                  max={100}
                  min={0}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  type="range"
                  value={volume}
                />
              </div>
            </section>

            <section>
              <p className="cmd-label">Suggested cut</p>
              <div className="mt-3 rounded-lg border border-border bg-[rgba(0,240,255,0.06)] p-4">
                <p className="text-sm font-medium text-foreground">
                  {card.aiSuggestions.performanceSummary || "Suggested cut point detected at 00:01:14 based on audio waveform drop."}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {selectedAsset?.note || "Use the first line to establish the contrast between the messy setup and the refined version."}
                </p>
              </div>
            </section>
          </div>
        </Panel>
      </div>
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
      <span className="text-sm text-foreground">{label}</span>
      <input
        className="mt-2 w-full accent-[var(--accent)]"
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
