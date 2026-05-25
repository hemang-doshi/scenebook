export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";
export type TrackType = "video" | "text" | "audio";
export type DockItem =
  | "sync"
  | "templates"
  | "uploads"
  | "media"
  | "text"
  | "captions"
  | "elements"
  | "audio"
  | "brand"
  | "ai";
export type ClipType = "video" | "image" | "text" | "caption" | "audio";

export interface Track {
  id: string;
  type: TrackType;
  label: string;
  muted: boolean;
  locked: boolean;
}

export interface Clip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  type: ClipType;
  title: string;
  color: string;
}

export interface CanvasObject {
  id: string;
  type: ClipType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  label: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, { w: number; h: number; label: string }> = {
  "9:16": { w: 9, h: 16, label: "9:16 Portrait" },
  "16:9": { w: 16, h: 9, label: "16:9 Landscape" },
  "1:1": { w: 1, h: 1, label: "1:1 Square" },
  "4:5": { w: 4, h: 5, label: "4:5 Vertical" },
};

export const CLIP_COLORS: Record<ClipType, string> = {
  video: "var(--ed-timeline-clip-video)",
  image: "var(--ed-timeline-clip-video)",
  text: "var(--ed-timeline-clip-text)",
  caption: "var(--ed-timeline-clip-text)",
  audio: "var(--ed-timeline-clip-audio)",
};

export const DOCK_ITEMS: { id: DockItem; label: string; icon: string }[] = [
  { id: "sync", label: "SceneBook Sync", icon: "RefreshCw" },
  { id: "templates", label: "Templates", icon: "LayoutTemplate" },
  { id: "uploads", label: "Uploads", icon: "Upload" },
  { id: "media", label: "Media", icon: "Film" },
  { id: "text", label: "Text", icon: "Type" },
  { id: "captions", label: "Captions", icon: "MessageSquare" },
  { id: "elements", label: "Elements", icon: "Shapes" },
  { id: "audio", label: "Audio", icon: "Music" },
  { id: "brand", label: "Brand", icon: "Palette" },
  { id: "ai", label: "AI Tools", icon: "Sparkles" },
];
