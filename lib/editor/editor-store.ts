import { create } from "zustand";
import { temporal } from "zundo";
import type {
  AspectRatio,
  Clip,
  ClipType,
  CanvasObject,
  DockItem,
  Track,
} from "./types";
import { CLIP_COLORS } from "./types";

let _clipId = 0;
function nextClipId() {
  _clipId += 1;
  return `clip-${_clipId}`;
}

let _trackId = 0;
function nextTrackId() {
  _trackId += 1;
  return `track-${_trackId}`;
}

let _objId = 0;
function nextObjId() {
  _objId += 1;
  return `obj-${_objId}`;
}

// ── State ──

interface EditorState {
  // Project
  projectId: string;
  projectTitle: string;

  // Canvas
  aspectRatio: AspectRatio;
  zoom: number;

  // Dock
  activeDockItem: DockItem | null;
  isAssetPanelOpen: boolean;

  // Inspector
  isInspectorOpen: boolean;

  // Timeline
  tracks: Track[];
  clips: Clip[];
  playhead: number;
  isPlaying: boolean;
  timelineZoom: number;
  selectedClipId: string | null;
  isTimelineCollapsed: boolean;

  // Canvas Objects
  canvasObjects: CanvasObject[];
  selectedObjectId: string | null;
}

// ── Actions ──

interface EditorActions {
  // Project
  setProject: (id: string, title: string) => void;

  // Canvas
  setAspectRatio: (ratio: AspectRatio) => void;
  setZoom: (zoom: number) => void;

  // Dock
  setActiveDockItem: (item: DockItem | null) => void;
  toggleAssetPanel: () => void;

  // Inspector
  toggleInspector: () => void;

  // Timeline
  addTrack: (type: Track["type"], label: string) => void;
  removeTrack: (trackId: string) => void;
  addClip: (trackId: string, type: ClipType, title: string, duration: number) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  trimClip: (clipId: string, newDuration: number, newStartTime?: number) => void;
  splitClipAtPlayhead: () => void;
  reorderClip: (clipId: string, overClipId: string) => void;
  selectClip: (clipId: string | null) => void;
  setPlayhead: (time: number) => void;
  togglePlay: () => void;
  setTimelineZoom: (zoom: number) => void;
  toggleTimeline: () => void;

  // Canvas Objects
  addCanvasObject: (type: ClipType, label: string) => void;
  removeCanvasObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  updateCanvasObject: (id: string, patch: Partial<CanvasObject>) => void;
  deselectAll: () => void;

  // Reset
  resetEditor: () => void;
}

export type EditorStore = EditorState & EditorActions;

// ── Initial state ──

const initialTracks: Track[] = [
  { id: "track-v1", type: "video", label: "V1", muted: false, locked: false },
  { id: "track-text", type: "text", label: "Text", muted: false, locked: false },
  { id: "track-a1", type: "audio", label: "A1", muted: false, locked: false },
];

const initialState: EditorState = {
  projectId: "",
  projectTitle: "Untitled Project",
  aspectRatio: "9:16",
  zoom: 100,
  activeDockItem: null,
  isAssetPanelOpen: false,
  isInspectorOpen: true,
  tracks: initialTracks,
  clips: [],
  playhead: 0,
  isPlaying: false,
  timelineZoom: 1,
  selectedClipId: null,
  isTimelineCollapsed: false,
  canvasObjects: [],
  selectedObjectId: null,
};

// ── Store ──

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      ...initialState,

      // Project
      setProject: (id, title) => set({ projectId: id, projectTitle: title }),

      // Canvas
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),

      // Dock
      setActiveDockItem: (item) => {
        const current = get().activeDockItem;
        if (current === item) {
          set({ activeDockItem: null, isAssetPanelOpen: false });
        } else {
          set({ activeDockItem: item, isAssetPanelOpen: true });
        }
      },
      toggleAssetPanel: () => set((s) => ({ isAssetPanelOpen: !s.isAssetPanelOpen })),

      // Inspector
      toggleInspector: () => set((s) => ({ isInspectorOpen: !s.isInspectorOpen })),

      // Timeline — Tracks
      addTrack: (type, label) => {
        const id = nextTrackId();
        set((s) => ({
          tracks: [...s.tracks, { id, type, label, muted: false, locked: false }],
        }));
      },
      removeTrack: (trackId) =>
        set((s) => ({
          tracks: s.tracks.filter((t) => t.id !== trackId),
          clips: s.clips.filter((c) => c.trackId !== trackId),
        })),

      // Timeline — Clips
      addClip: (trackId, type, title, duration) => {
        const id = nextClipId();
        const existing = get().clips.filter((c) => c.trackId === trackId);
        const startTime = existing.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
        const color = CLIP_COLORS[type];
        set((s) => ({
          clips: [...s.clips, { id, trackId, startTime, duration, type, title, color }],
          selectedClipId: id,
        }));
      },
      removeClip: (clipId) =>
        set((s) => ({
          clips: s.clips.filter((c) => c.id !== clipId),
          selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
        })),
      moveClip: (clipId, newTrackId, newStartTime) =>
        set((s) => ({
          clips: s.clips.map((c) =>
            c.id === clipId
              ? { ...c, trackId: newTrackId, startTime: Math.max(0, newStartTime) }
              : c
          ),
        })),
      trimClip: (clipId, newDuration, newStartTime) =>
        set((s) => ({
          clips: s.clips.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  duration: Math.max(0.5, newDuration),
                  startTime: newStartTime !== undefined ? Math.max(0, newStartTime) : c.startTime,
                }
              : c
          ),
        })),
      splitClipAtPlayhead: () => {
        const { playhead, clips, selectedClipId } = get();
        const target = selectedClipId
          ? clips.find((c) => c.id === selectedClipId)
          : clips.find((c) => playhead > c.startTime && playhead < c.startTime + c.duration);

        if (!target) return;
        const splitPoint = playhead - target.startTime;
        if (splitPoint <= 0.1 || splitPoint >= target.duration - 0.1) return;

        const clipA: Clip = {
          ...target,
          id: nextClipId(),
          duration: Number(splitPoint.toFixed(2)),
        };
        const clipB: Clip = {
          ...target,
          id: nextClipId(),
          startTime: Number((target.startTime + splitPoint).toFixed(2)),
          duration: Number((target.duration - splitPoint).toFixed(2)),
        };

        set((s) => ({
          clips: s.clips.flatMap((c) => (c.id === target.id ? [clipA, clipB] : [c])),
          selectedClipId: clipB.id,
        }));
      },
      reorderClip: (clipId, overClipId) => {
        const { clips } = get();
        const dragIdx = clips.findIndex((c) => c.id === clipId);
        const overIdx = clips.findIndex((c) => c.id === overClipId);
        if (dragIdx === -1 || overIdx === -1) return;
        const next = [...clips];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(overIdx, 0, moved);
        set({ clips: next });
      },
      selectClip: (clipId) =>
        set({ selectedClipId: clipId, selectedObjectId: null }),

      // Timeline — Playback
      setPlayhead: (time) => set({ playhead: Math.max(0, time) }),
      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.25, Math.min(4, zoom)) }),
      toggleTimeline: () => set((s) => ({ isTimelineCollapsed: !s.isTimelineCollapsed })),

      // Canvas Objects
      addCanvasObject: (type, label) => {
        const id = nextObjId();
        set((s) => ({
          canvasObjects: [
            ...s.canvasObjects,
            { id, type, x: 120, y: 160, width: 200, height: 120, rotation: 0, opacity: 1, label },
          ],
          selectedObjectId: id,
        }));
      },
      removeCanvasObject: (id) =>
        set((s) => ({
          canvasObjects: s.canvasObjects.filter((o) => o.id !== id),
          selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
        })),
      selectObject: (id) =>
        set({ selectedObjectId: id, selectedClipId: null }),
      updateCanvasObject: (id, patch) =>
        set((s) => ({
          canvasObjects: s.canvasObjects.map((o) =>
            o.id === id ? { ...o, ...patch } : o
          ),
        })),
      deselectAll: () => set({ selectedObjectId: null, selectedClipId: null }),

      // Reset
      resetEditor: () => set({ ...initialState, tracks: initialTracks }),
    }),
    { limit: 50 }
  )
);
