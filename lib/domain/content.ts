import type { CardAsset, ContentStatus, ScriptLab, ShootPack } from "@/lib/types";

const orderedStatuses: ContentStatus[] = [
  "idea",
  "scripted",
  "ready_to_shoot",
  "shot",
  "editing",
  "posted",
  "analyzed",
];

export const statusLabels: Record<ContentStatus, string> = {
  inbox: "Inbox",
  idea: "Idea",
  scripted: "Scripted",
  ready_to_shoot: "Ready to Shoot",
  shot: "Shot",
  editing: "Editing",
  posted: "Posted",
  analyzed: "Analyzed",
  archived: "Archived",
};

export function getAllowedStatusMoves(status: ContentStatus): ContentStatus[] {
  if (status === "inbox") {
    return ["idea", "archived"];
  }

  if (status === "archived") {
    return [];
  }

  const index = orderedStatuses.indexOf(status);

  if (index === -1) {
    return ["archived"];
  }

  const moves = new Set<ContentStatus>();

  if (index > 0) {
    moves.add(orderedStatuses[index - 1]);
  }

  if (index < orderedStatuses.length - 1) {
    moves.add(orderedStatuses[index + 1]);
  }

  moves.add("archived");

  return [...moves];
}

function hasScriptReadiness(scriptLab: ScriptLab): boolean {
  return Boolean(scriptLab.hook.trim() && scriptLab.script.trim());
}

function hasChecklistReadiness(shootPack: ShootPack): boolean {
  const allItems = [
    ...shootPack.aRoll,
    ...shootPack.bRoll,
    ...shootPack.screenCaptures,
    ...shootPack.props,
    ...shootPack.missingAssets,
  ];

  return allItems.length > 0 && allItems.every((item) => item.done);
}

function hasAssetReadiness(assets: CardAsset[]): boolean {
  return assets.length > 0;
}

export function getCardReadiness({
  scriptLab,
  shootPack,
  assets,
}: {
  scriptLab: ScriptLab;
  shootPack: ShootPack;
  assets: CardAsset[];
}) {
  const checks = [
    hasScriptReadiness(scriptLab),
    hasChecklistReadiness(shootPack),
    hasAssetReadiness(assets),
  ];
  const score = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  const missing: string[] = [];

  if (!checks[0]) {
    missing.push("Add a hook and a working script");
  }

  if (!checks[1]) {
    missing.push("Complete every shoot checklist item");
  }

  if (!checks[2]) {
    missing.push("Attach at least one supporting asset");
  }

  return {
    score,
    label: score >= 100 ? "Shoot-ready" : score >= 67 ? "Nearly ready" : "Needs work",
    missing,
  };
}
