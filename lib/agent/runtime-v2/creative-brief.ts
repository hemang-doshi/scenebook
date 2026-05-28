import type { JsonValue } from "@/lib/types";

export interface CreativeBrief {
  duration?: '15 sec' | '30 sec' | '45 sec' | '60 sec';
  durationSeconds?: number;
  platform?: 'Instagram' | 'TikTok' | 'YouTube Shorts' | 'LinkedIn' | 'X';
  tone?: 'cinematic' | 'funny' | 'raw' | 'technical' | 'emotional' | 'polished' | 'chaotic' | 'premium';
  format?: 'talking head' | 'vlog' | 'product demo' | 'montage' | 'typography' | 'screen recording' | 'hybrid';
  creatorPresence?: 'face' | 'voiceover' | 'screen recording' | 'no face' | 'hybrid';
  cta?: string;
  contentGoal?: string;
  coreAngle?: string;
  viewerEmotion?: string;
  [key: string]: JsonValue | undefined;
}

export function extractCreativeBrief(text: string): CreativeBrief {
  const brief: CreativeBrief = {};

  // 1. Duration
  const d15 = /\b15\s*(s|sec|second|seconds)\b/i;
  const d30 = /\b30\s*(s|sec|second|seconds)\b/i;
  const d45 = /\b45\s*(s|sec|second|seconds)\b/i;
  const d60 = /\b60\s*(s|sec|second|seconds)\b/i;

  if (d15.test(text)) {
    brief.duration = '15 sec';
    brief.durationSeconds = 15;
  } else if (d30.test(text)) {
    brief.duration = '30 sec';
    brief.durationSeconds = 30;
  } else if (d45.test(text)) {
    brief.duration = '45 sec';
    brief.durationSeconds = 45;
  } else if (d60.test(text)) {
    brief.duration = '60 sec';
    brief.durationSeconds = 60;
  }

  // 2. Platform
  if (/\b(youtube\s*shorts|shorts)\b/i.test(text)) {
    brief.platform = 'YouTube Shorts';
  } else if (/\b(instagram|ig|insta)\b/i.test(text)) {
    brief.platform = 'Instagram';
  } else if (/\btiktok\b/i.test(text)) {
    brief.platform = 'TikTok';
  } else if (/\blinkedin\b/i.test(text)) {
    brief.platform = 'LinkedIn';
  } else if (/\b(twitter|x\.com)\b/i.test(text) || /\bx\b/i.test(text)) {
    brief.platform = 'X';
  }

  // 3. Tone
  if (/\bcinematic\b/i.test(text)) {
    brief.tone = 'cinematic';
  } else if (/\b(funny|humorous|hilarious)\b/i.test(text)) {
    brief.tone = 'funny';
  } else if (/\b(raw|unfiltered|authentic)\b/i.test(text)) {
    brief.tone = 'raw';
  } else if (/\b(technical|dev|code|complex|detailed)\b/i.test(text)) {
    brief.tone = 'technical';
  } else if (/\b(emotional|touching|moving)\b/i.test(text)) {
    brief.tone = 'emotional';
  } else if (/\b(polished|clean|sleek)\b/i.test(text)) {
    brief.tone = 'polished';
  } else if (/\b(chaotic|crazy|wild)\b/i.test(text)) {
    brief.tone = 'chaotic';
  } else if (/\b(premium|high-end|luxury|expensive)\b/i.test(text)) {
    brief.tone = 'premium';
  }

  // 4. Format
  if (/\btalking\s*head\b/i.test(text)) {
    brief.format = 'talking head';
  } else if (/\bvlog\b/i.test(text)) {
    brief.format = 'vlog';
  } else if (/\b(product\s*demo|demo)\b/i.test(text)) {
    brief.format = 'product demo';
  } else if (/\bmontage\b/i.test(text)) {
    brief.format = 'montage';
  } else if (/\b(typography|text-only|kinetic)\b/i.test(text)) {
    brief.format = 'typography';
  } else if (/\b(screen\s*recording|screencast)\b/i.test(text)) {
    brief.format = 'screen recording';
  } else if (/\bhybrid\b/i.test(text)) {
    brief.format = 'hybrid';
  }

  // 5. Creator Presence
  if (/\b(no\s*face|faceless)\b/i.test(text)) {
    brief.creatorPresence = 'no face';
  } else if (/\b(face|on-camera)\b/i.test(text)) {
    brief.creatorPresence = 'face';
  } else if (/\b(voiceover|vo|voice-over)\b/i.test(text)) {
    brief.creatorPresence = 'voiceover';
  } else if (/\b(screen\s*recording|screencast)\b/i.test(text)) {
    brief.creatorPresence = 'screen recording';
  } else if (/\bhybrid\b/i.test(text)) {
    brief.creatorPresence = 'hybrid';
  }

  // 6. CTA
  const ctaRegex = /(?:cta|call to action|call-to-action)\s*(?:is|:|==|=>|=)\s*["']?([^"'\n\r.]+)/i;
  const match = text.match(ctaRegex);
  if (match && match[1]) {
    brief.cta = match[1].trim();
  }

  return brief;
}

export function mergeCreativeBrief(existing: CreativeBrief, extracted: CreativeBrief): CreativeBrief {
  const merged = { ...existing };
  for (const key of Object.keys(extracted)) {
    if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
      merged[key] = extracted[key];
    }
  }
  return merged;
}

export function getMissingCreativeFields(brief: CreativeBrief, workflow: string): string[] {
  if (workflow !== 'script') {
    return [];
  }
  const required = [
    'contentGoal',
    'coreAngle',
    'platform',
    'durationSeconds',
    'format',
    'tone',
    'viewerEmotion',
    'cta',
  ];
  return required.filter(field => {
    const val = brief[field];
    return val === undefined || val === null || val === '';
  });
}
