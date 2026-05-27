"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Library, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/fetcher";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";

export function AssetDrawer({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
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
      <div className="pointer-events-auto absolute right-0 top-0 z-20">
        <Button type="button" variant="secondary" className="rounded-full" onClick={() => { setLibrary(null); setOpen(true); }}>
          <Library className="mr-2 h-4 w-4" />
          Assets
        </Button>
      </div>
      {open ? (
        <div className="absolute inset-y-0 right-0 z-30 w-full max-w-sm pl-4">
          <Card className="flex h-full flex-col border-border/80 bg-background/96">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Asset Library</CardTitle>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-full px-0"
                aria-label="Close asset drawer"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              <ScrollArea className="h-full pr-3">
                <div className="grid gap-4">
                  {loading ? (
                    <>
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </>
                  ) : null}
                  {error ? <p className="text-sm text-red-100">{error}</p> : null}
                  {!loading && !error && library ? (
                    <>
                      {library.folders.length === 0 ? (
                        <Empty className="items-start text-left">
                          <p className="text-sm text-foreground">No folders yet.</p>
                          <p className="mt-1 text-xs text-muted">Generated assets will show placeholder folders here once they exist.</p>
                        </Empty>
                      ) : (
                        library.folders.map((folder) => (
                          <Card key={folder.id} className="border-border/70 bg-black/20">
                            <CardHeader className="py-4">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-accent" />
                                <CardTitle>{folder.name}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="grid gap-2">
                              {folder.assets.length === 0 ? (
                                <p className="text-xs text-muted">Empty folder</p>
                              ) : (
                                folder.assets.map((asset) => (
                                  <div key={asset.id} className="rounded-2xl border border-border/70 bg-black/30 px-3 py-2">
                                    <p className="text-sm text-foreground">{asset.title}</p>
                                    <p className="text-xs uppercase tracking-[0.08em] text-muted">{asset.type}</p>
                                  </div>
                                ))
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                      <Card className="border-border/70 bg-black/20">
                        <CardHeader className="py-4">
                          <CardTitle>Loose Assets</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                          {library.looseAssets.length === 0 ? (
                            <p className="text-xs text-muted">No loose assets.</p>
                          ) : (
                            library.looseAssets.map((asset) => (
                              <div key={asset.id} className="rounded-2xl border border-border/70 bg-black/30 px-3 py-2">
                                <p className="text-sm text-foreground">{asset.title}</p>
                                <p className="text-xs uppercase tracking-[0.08em] text-muted">{asset.type}</p>
                              </div>
                            ))
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
