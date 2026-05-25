"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { fetchJson } from "@/lib/fetcher";
import type { CardDetail, ProjectWorkspace, WorkspaceSnapshot } from "@/lib/data/repository";

export function useWorkspaceSnapshot() {
  const [data, setData] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (active = true) => {
    try {
      const next = await fetchJson<WorkspaceSnapshot>("/api/workspace");
      if (active) {
        setData(next);
        setError(null);
      }
    } catch (caught) {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Unable to load workspace.");
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchJson<WorkspaceSnapshot>("/api/workspace")
      .then((next) => {
        if (active) {
          setData(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load workspace.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  return {
    data,
    error,
    refresh,
    isPending,
    isLoading: !data && !error,
  };
}

export function useCardDetail(cardId: string) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (active = true) => {
    try {
      const next = await fetchJson<CardDetail>(`/api/cards/${cardId}`);
      if (active) {
        setCard(next);
        setError(null);
      }
    } catch (caught) {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Unable to load card.");
      }
    }
  }, [cardId]);

  useEffect(() => {
    let active = true;
    fetchJson<CardDetail>(`/api/cards/${cardId}`)
      .then((next) => {
        if (active) {
          setCard(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load card.");
        }
      });

    return () => {
      active = false;
    };
  }, [cardId]);

  const refresh = useCallback(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  return {
    card,
    error,
    refresh,
    isPending,
    isLoading: !card && !error,
    setCard,
  };
}

export function useProjectWorkspace(projectId: string) {
  const [project, setProject] = useState<ProjectWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (active = true) => {
    try {
      const next = await fetchJson<ProjectWorkspace>(`/api/projects/${projectId}`);
      if (active) {
        setProject(next);
        setError(null);
      }
    } catch (caught) {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Unable to load project.");
      }
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetchJson<ProjectWorkspace>(`/api/projects/${projectId}`)
      .then((next) => {
        if (active) {
          setProject(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load project.");
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const refresh = useCallback(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  return {
    project,
    error,
    refresh,
    isPending,
    isLoading: !project && !error,
    setProject,
  };
}
