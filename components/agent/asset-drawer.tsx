"use client";

import { useEffect, useState } from "react";
import { FolderOpen, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/fetcher";
import type { CardAsset } from "@/lib/types";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";

function AssetRow({ asset }: { asset: CardAsset }) {
  const showImagePreview = asset.type === "image" || asset.type === "thumbnail";
  const showVideoPreview = asset.type === "video";
  const showAudioPreview = asset.type === "audio";

  return (
    <div className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-3">
      {showImagePreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.title}
          className="mb-3 aspect-video w-full rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] object-cover"
        />
      ) : null}
      {showVideoPreview ? (
        <video
          src={asset.url}
          controls
          preload="metadata"
          className="mb-3 aspect-video w-full rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] object-cover"
        />
      ) : null}
      {showAudioPreview ? (
        <audio
          src={asset.url}
          controls
          preload="metadata"
          className="mb-3 w-full rounded-[var(--rounded-md)]"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ink)] truncate" title={asset.title}>{asset.title}</p>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">{asset.type}</p>
        </div>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 shrink-0 items-center rounded-full border border-[var(--hairline)] bg-[var(--canvas)] hover:bg-[var(--surface-soft)] px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--ink)] transition-colors"
          aria-label={`Open ${asset.title}`}
        >
          Open
        </a>
      </div>
    </div>
  );
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
          className="absolute left-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))]"
        >
          <Card className="flex max-h-[min(32rem,calc(100vh-10rem))] flex-col border border-[var(--hairline)] bg-[var(--canvas)] shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-[var(--rounded-lg)]">
            <CardHeader className="flex-row items-center justify-between border-b border-[var(--hairline)] py-3 px-5">
              <CardTitle className="text-sm font-bold text-[var(--ink)]">Asset Library</CardTitle>
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 rounded-full px-0 hover:bg-[var(--surface-soft)]"
                aria-label="Close asset menu"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 text-[var(--ink)]" />
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-4">
              <ScrollArea className="h-full pr-3 scrollbar-thin">
                <div className="grid gap-4">
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
                          <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">Generated assets will show placeholder folders here once they exist.</p>
                        </Empty>
                      ) : (
                        library.folders.map((folder) => (
                          <Card key={folder.id} className="border border-[var(--hairline)] bg-[var(--surface-soft)]/30 rounded-[var(--rounded-md)] shadow-none">
                            <CardHeader className="py-3 px-4 border-b border-[var(--hairline)]">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-[var(--ink)]" />
                                <CardTitle className="text-xs font-bold text-[var(--ink)]">{folder.name}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="grid gap-2 p-3 bg-[var(--canvas)]">
                              {folder.assets.length === 0 ? (
                                <p className="text-xs text-[var(--muted)]">Empty folder</p>
                              ) : (
                                folder.assets.map((asset) => <AssetRow key={asset.id} asset={asset} />)
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                      <Card className="border border-[var(--hairline)] bg-[var(--surface-soft)]/30 rounded-[var(--rounded-md)] shadow-none">
                        <CardHeader className="py-3 px-4 border-b border-[var(--hairline)]">
                          <CardTitle className="text-xs font-bold text-[var(--ink)]">Loose Assets</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-3 bg-[var(--canvas)]">
                          {library.looseAssets.length === 0 ? (
                            <p className="text-xs text-[var(--muted)]">No loose assets.</p>
                          ) : (
                            library.looseAssets.map((asset) => <AssetRow key={asset.id} asset={asset} />)
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
