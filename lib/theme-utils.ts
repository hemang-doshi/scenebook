export const platformColors: Record<string, { bg: string; text: string; border: string }> = {
  youtube: { bg: "var(--block-coral)", text: "#793400", border: "#e5c5b5" }, // peach/rust
  instagram: { bg: "var(--block-pink)", text: "#a02e6d", border: "#e8c5d5" }, // rose/deep pink
  tiktok: { bg: "var(--block-mint)", text: "#005bab", border: "#c5d9eb" }, // sky/link-blue
  linkedin: { bg: "var(--block-lilac)", text: "#391c57", border: "#d4c8e5" }, // lavender/purple
  x: { bg: "var(--block-cream)", text: "#523410", border: "#e2ddcb" }, // cream/brown
};

export const formatColors: Record<string, { bg: string; text: string; border: string }> = {
  reel: { bg: "var(--block-lilac)", text: "#5645d4", border: "#d4c8e5" },
  short: { bg: "var(--block-coral)", text: "#dd5b00", border: "#e5c5b5" },
  tiktok: { bg: "var(--block-mint)", text: "#0075de", border: "#c5d9eb" },
  carousel: { bg: "var(--block-pink)", text: "#ff64c8", border: "#e8c5d5" },
  post: { bg: "var(--block-cream)", text: "#37352f", border: "#e2ddcb" },
  vlog: { bg: "#d9f3e1", text: "#1aae39", border: "#bce4c7" }, // mint/green
};

export const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  idea: { bg: "#f0eeec", text: "#5d5b54", border: "var(--hairline)" }, // gray
  scripted: { bg: "var(--block-cream)", text: "#523410", border: "#e2ddcb" }, // yellow/cream
  ready_to_shoot: { bg: "#d9f3e1", text: "#1aae39", border: "#bce4c7" }, // green
  shot: { bg: "var(--block-mint)", text: "#005bab", border: "#c5d9eb" }, // sky/blue
  editing: { bg: "var(--block-lilac)", text: "#5645d4", border: "#d4c8e5" }, // purple
  posted: { bg: "var(--block-pink)", text: "#a02e6d", border: "#e8c5d5" }, // rose
  analyzed: { bg: "#fef7d6", text: "#793400", border: "#ebdca8" }, // yellow
  archived: { bg: "#ede9e4", text: "#787671", border: "var(--hairline-strong)" }, // strong gray
};
