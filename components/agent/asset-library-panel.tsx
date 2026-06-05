"use client";

import { FolderOpen } from "lucide-react";

import { Empty } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import type { CardAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

function assetProvenance(asset: CardAsset) {
  const metadata = asset.metadata ?? {};
  const model = typeof metadata.model === "string" ? metadata.model : null;
  const provider = typeof metadata.provider === "string" ? metadata.provider : null;
  const source = typeof asset.source === "string" ? asset.source : "generated";
  return [provider, model, source].filter(Boolean).join(" / ");
}

export function AssetLibraryPanel({
  projectId,
  library,
  loading = false,
  error,
  compact = false,
}: {
  projectId: string;
  library: ProjectAssetLibrary | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  return (
    <ScrollArea className={cn("h-full pr-3 scrollbar-thin", compact ? "max-h-[24rem]" : "max-h-[calc(64vh-4rem)]")}>
      <div className="grid gap-2">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : null}
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {!loading && !error && library ? (
          <>
            {library.folders.length === 0 && library.looseAssets.length === 0 ? (
              <Empty className="items-start text-left">
                <p className="text-sm text-[var(--ink)]">No assets yet.</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  Generated or imported assets will appear here without covering the chat.
                </p>
              </Empty>
            ) : null}
            {library.folders.map((folder) => (
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
                    folder.assets.map((asset) => <AssetRow key={asset.id} asset={asset} projectId={projectId} compact={compact} />)
                  )}
                </div>
              </section>
            ))}
            {library.looseAssets.length > 0 ? (
              <section className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.035)]">
                <div className="border-b border-[var(--line)] px-3 py-2">
                  <p className="text-xs font-bold text-[var(--ink)]">Loose Assets</p>
                </div>
                <div className="grid gap-2 bg-transparent p-2">
                  {library.looseAssets.map((asset) => <AssetRow key={asset.id} asset={asset} projectId={projectId} compact={compact} />)}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </ScrollArea>
  );
}

export function AssetRow({ asset, projectId, compact = false }: { asset: CardAsset; projectId: string; compact?: boolean }) {
  const showImagePreview = asset.type === "image" || asset.type === "thumbnail";
  const showVideoPreview = asset.type === "video";
  const showAudioPreview = asset.type === "audio";
  const provenance = assetProvenance(asset);

  return (
    <div className={cn("flex gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.045)] p-2", compact && "p-1.5")}>
      {showImagePreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.title}
          className={cn("shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] object-cover", compact ? "h-10 w-12" : "h-12 w-14")}
        />
      ) : null}
      {showVideoPreview ? (
        <video
          src={asset.url}
          controls
          preload="metadata"
          className={cn("shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] object-cover", compact ? "h-10 w-12" : "h-12 w-14")}
        />
      ) : null}
      {showAudioPreview ? (
        <div className={cn("flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[10px] font-mono uppercase text-[var(--muted)]", compact ? "h-10 w-12" : "h-12 w-14")}>
          Audio
        </div>
      ) : null}
      {!showImagePreview && !showVideoPreview && !showAudioPreview ? (
        <div className={cn("flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[10px] font-mono uppercase text-[var(--muted)]", compact ? "h-10 w-12" : "h-12 w-14")}>
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
