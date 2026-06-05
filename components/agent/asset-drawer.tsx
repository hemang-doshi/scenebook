"use client";

import { useEffect, useState } from "react";
import { FolderOpen, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/fetcher";
import type { CardAsset } from "@/lib/types";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";

function AssetRow({ asset, projectId }: { asset: CardAsset; projectId: string }) {
  const showImagePreview = asset.type === "image" || asset.type === "thumbnail";
  const showVideoPreview = asset.type === "video";
  const showAudioPreview = asset.type === "audio";
  const provenance = assetProvenance(asset);

  return (
    <div className="flex gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.045)] p-2">
      {showImagePreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.title}
          className="h-12 w-14 shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] object-cover"
        />
      ) : null}
      {showVideoPreview ? (
        <video
          src={asset.url}
          controls
          preload="metadata"
          className="h-12 w-14 shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] object-cover"
        />
      ) : null}
      {showAudioPreview ? (
        <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[10px] font-mono uppercase text-[var(--muted)]">
          Audio
        </div>
      ) : null}
      {!showImagePreview && !showVideoPreview && !showAudioPreview ? (
        <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[10px] font-mono uppercase text-[var(--muted)]">
          File
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--ink)]" title={asset.title}>{asset.title}</p>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">{asset.type}</p>
          <p className="mt-1 line-clamp-2 text-[10px] font-mono uppercase tracking-wider text-[var(--blue-2)]">{provenance}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <a
            href={`/editor/${projectId}?asset=${asset.id}`}
            className="inline-flex h-6 items-center rounded-[var(--radius-pill)] border border-[var(--blue)]/40 bg-[var(--blue)]/12 px-2 text-[9px] font-mono uppercase tracking-wider text-[var(--blue-2)] transition-colors hover:border-[var(--blue)]"
            aria-label={`Import ${asset.title} to editor`}
          >
            Import
          </a>
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-6 items-center rounded-[var(--radius-pill)] border border-[var(--line)] bg-[rgba(255,255,255,.045)] px-2 text-[9px] font-mono uppercase tracking-wider text-[var(--ink)] transition-colors hover:border-[var(--line-strong)]"
            aria-label={`Open ${asset.title}`}
          >
            Open
          </a>
        </div>
      </div>
    </div>
  );
}

function assetProvenance(asset: CardAsset) {
  const metadata = asset.metadata ?? {};
  const model = typeof metadata.model === "string" ? metadata.model : null;
  const provider = typeof metadata.provider === "string" ? metadata.provider : null;
  const source = typeof asset.source === "string" ? asset.source : "generated";
  return [provider, model, source].filter(Boolean).join(" / ");
}

export function AssetDrawer({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadLibrary() {
      setLoading(true);
      setError(null);

      try {
        const nextLibrary = await fetchJson<ProjectAssetLibrary>(`/api/projects/${projectId}/assets`);

        if (!cancelled) {
          setLibrary(nextLibrary);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load assets.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  return (
    <>
      {open ? (
        <div
          data-testid="asset-library-panel"
          role="region"
          aria-label="Asset library popover"
          className="absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-1.5rem))] animate-[ed-fadeIn_0.15s_ease-out]"
        >
          <div className="flex max-h-[min(64vh,calc(100vh-12rem))] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(20,24,33,.96)] shadow-[var(--shadow-soft)] backdrop-blur-[18px]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--ink)]">Assets</p>
              <Button
                type="button"
                variant="ghost"
                className="h-7 min-h-7 w-7 rounded-full px-0 py-0 focus-visible:ring-0"
                aria-label="Close asset menu"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 text-[var(--ink)]" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 p-2.5">
              <ScrollArea className="h-full max-h-[calc(64vh-4rem)] pr-3 scrollbar-thin">
                <div className="grid gap-2">
                  {loading ? (
                    <>
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </>
                  ) : null}
                  {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
                  {!loading && !error && library ? (
                    <>
                      {library.folders.length === 0 ? (
                        <Empty className="items-start text-left">
                          <p className="text-sm text-[var(--ink)]">No folders yet.</p>
                          <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">Assets can be generated through the Agent and attached here when they exist.</p>
                        </Empty>
                      ) : (
                        library.folders.map((folder) => (
                          <section key={folder.id} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.035)]">
                            <div className="border-b border-[var(--line)] px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-[var(--blue-2)]" />
                                <p className="text-xs font-bold text-[var(--ink)]">{folder.name}</p>
                              </div>
                            </div>
                            <div className="grid gap-2 bg-transparent p-2">
                              {folder.assets.length === 0 ? (
                                <p className="text-xs text-[var(--muted)]">Empty folder</p>
                              ) : (
                                folder.assets.map((asset) => <AssetRow key={asset.id} asset={asset} projectId={projectId} />)
                              )}
                            </div>
                          </section>
                        ))
                      )}
                      <section className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.035)]">
                        <div className="border-b border-[var(--line)] px-3 py-2">
                          <p className="text-xs font-bold text-[var(--ink)]">Loose Assets</p>
                        </div>
                        <div className="grid gap-2 bg-transparent p-2">
                          {library.looseAssets.length === 0 ? (
                            <p className="text-xs text-[var(--muted)]">No loose assets.</p>
                          ) : (
                            library.looseAssets.map((asset) => <AssetRow key={asset.id} asset={asset} projectId={projectId} />)
                          )}
                        </div>
                      </section>
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
