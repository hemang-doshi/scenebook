"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Check } from "lucide-react";

export default function ExportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState("30");
  const [quality, setQuality] = useState<"standard" | "high">("high");
  const [watermark, setWatermark] = useState(false);
  const [destination, setDestination] = useState("download");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-export-modal", handler);
    return () => window.removeEventListener("open-export-modal", handler);
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setDone(true);
          setTimeout(() => { setDone(false); setIsOpen(false); }, 1500);
          return 100;
        }
        return p + 2.5;
      });
    }, 100);
  };

  const selCls = "h-8 w-full rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] bg-[var(--ed-surface-muted)] px-2 text-xs text-[var(--ed-text-primary)]";
  const labelCls = "text-[11px] font-medium uppercase tracking-wider text-[var(--ed-text-muted)] mb-1.5 block";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !isExporting && setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[var(--ed-radius-xl)] border border-[var(--ed-border)] bg-[var(--ed-surface-raised)] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Export Video</h2>
              <button onClick={() => !isExporting && setIsOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-[var(--ed-radius-sm)] text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface-muted)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 h-px bg-[var(--ed-border-subtle)]" />

            {done ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ed-success)]/20 text-[var(--ed-success)]">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Export Complete!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div><label className={labelCls}>Format</label><select className={selCls}><option>MP4</option></select></div>
                <div><label className={labelCls}>Resolution</label><select value={resolution} onChange={(e) => setResolution(e.target.value)} className={selCls}><option>720p</option><option>1080p</option><option>4K</option></select></div>
                <div><label className={labelCls}>Frame Rate</label><select value={fps} onChange={(e) => setFps(e.target.value)} className={selCls}><option value="24">24 fps</option><option value="30">30 fps</option><option value="60">60 fps</option></select></div>
                <div>
                  <label className={labelCls}>Quality</label>
                  <div className="flex rounded-[var(--ed-radius-sm)] border border-[var(--ed-border-subtle)] overflow-hidden">
                    {(["standard", "high"] as const).map((q) => (
                      <button key={q} onClick={() => setQuality(q)} className={`flex-1 py-1.5 text-xs font-medium capitalize transition ${quality === q ? "bg-[var(--ed-accent)] text-white" : "bg-[var(--ed-surface-muted)] text-[var(--ed-text-muted)]"}`}>{q}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--ed-text-muted)]">Watermark</label>
                  <button onClick={() => setWatermark(!watermark)} className={`h-5 w-9 rounded-full transition ${watermark ? "bg-[var(--ed-accent)]" : "bg-[var(--ed-surface-muted)]"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${watermark ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div><label className={labelCls}>Destination</label><select value={destination} onChange={(e) => setDestination(e.target.value)} className={selCls}><option value="download">Download</option><option value="library">Save to Library</option></select></div>

                <div className="pt-2 h-px bg-[var(--ed-border-subtle)]" />

                {isExporting && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-[var(--ed-text-muted)]">Exporting...</span>
                      <span className="text-[10px] font-medium text-[var(--ed-accent)]">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ed-surface-muted)]">
                      <div className="h-full rounded-full bg-[var(--ed-accent)] transition-all duration-100" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--ed-radius-md)] bg-[var(--ed-accent)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--ed-accent-hover)] disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export Video"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
