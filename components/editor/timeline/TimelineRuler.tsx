"use client";

import { useMemo } from "react";

interface Props {
  totalDuration: number;
  pixelsPerSecond: number;
  onClickPosition: (time: number) => void;
}

export default function TimelineRuler({ totalDuration, pixelsPerSecond, onClickPosition }: Props) {
  const zoom = pixelsPerSecond / 80;

  const markers = useMemo(() => {
    const result: { time: number; label: string | null }[] = [];
    let step: number;
    let labelEvery: number;

    if (zoom >= 2) { step = 0.5; labelEvery = 2; }
    else if (zoom >= 1) { step = 1; labelEvery = 5; }
    else { step = 2; labelEvery = 10; }

    for (let t = 0; t <= totalDuration; t += step) {
      const rounded = Math.round(t * 100) / 100;
      const isLabel = rounded % labelEvery === 0;
      result.push({ time: rounded, label: isLabel ? `${rounded}s` : null });
    }
    return result;
  }, [totalDuration, zoom]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onClickPosition(Math.max(0, x / pixelsPerSecond));
  };

  return (
    <div
      className="relative flex h-6 cursor-pointer items-end border-b border-[var(--ed-border-subtle)] bg-[var(--ed-surface)]"
      onClick={handleClick}
    >
      {markers.map((m) => (
        <div
          key={m.time}
          className="absolute bottom-0 flex flex-col items-center"
          style={{ left: m.time * pixelsPerSecond }}
        >
          <div
            className="w-px bg-[var(--ed-border)]"
            style={{ height: m.label ? 12 : 8 }}
          />
          {m.label && (
            <span className="absolute -top-0.5 left-0.5 whitespace-nowrap text-[9px] text-[var(--ed-text-muted)]">
              {m.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
