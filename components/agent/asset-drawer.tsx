"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { AssetLibraryPanel } from "@/components/agent/asset-library-panel";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/fetcher";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";

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
              <AssetLibraryPanel projectId={projectId} library={library} loading={loading} error={error} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
