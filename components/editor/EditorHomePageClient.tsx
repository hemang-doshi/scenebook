"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Film, Plus, Clock, LayoutTemplate, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { useEditorStore } from "@/lib/editor/editor-store";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { RetroGrid } from "@/components/ui/retro-grid";
import type { ProjectSummary } from "@/lib/data/repository";

const templateCategories = [
  { label: "Instagram Reel", color: "#E040FB" },
  { label: "YouTube Shorts", color: "#FF1744" },
  { label: "Product Ad", color: "#00E5FF" },
  { label: "Podcast Clip", color: "#76FF03" },
  { label: "Educational", color: "#FFAB40" },
  { label: "Meme", color: "#FF6E40" },
];

export function EditorHomePageClient({
  projects,
}: {
  projects: ProjectSummary[];
}) {
  const resetEditor = useEditorStore((s) => s.resetEditor);

  useEffect(() => {
    resetEditor();
  }, [resetEditor]);

  return (
    <div className="relative flex min-h-screen bg-[#08080a] text-foreground overflow-hidden flex-col">
      <AuroraBackground />
      <RetroGrid className="opacity-15" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 flex-1 flex flex-col overflow-auto ed-scrollbar"
      >
        <header className="flex items-center justify-between border-b border-border/50 px-8 py-6 bg-black/25 backdrop-blur-md shrink-0">
          <div>
            <AppBreadcrumbs
              items={[{ label: "Projects", href: "/home" }, { label: "Editor" }]}
              className="[&_ol]:min-h-9 [&_ol]:bg-black/35 [&_ol]:px-3 [&_ol]:py-1.5 [&_ol]:text-xs"
            />
            <span className="mt-4 inline-block text-[10px] font-mono uppercase tracking-[0.15em] text-accent font-semibold">Video Studio</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">Project Deck</h1>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted hover:text-foreground hover:bg-white/5 transition duration-200 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </header>

        <div className="flex-1 px-8 py-8 space-y-8 max-w-7xl w-full mx-auto">
          <section className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> Start Designing
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/editor/new"
                className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-black/35 p-8 transition-all duration-300 hover:border-accent hover:bg-accent/5 cursor-pointer shadow-lg hover:shadow-accent/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-accent transition duration-300 group-hover:scale-110 group-hover:bg-accent/20 group-hover:border-accent/45">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-foreground">Blank Project</span>
              </Link>
              {templateCategories.slice(0, 3).map((cat) => (
                <button
                  key={cat.label}
                  className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-black/35 p-8 transition-all duration-300 hover:bg-white/5 cursor-pointer shadow-lg hover:border-border/100"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg border"
                    style={{
                      background: `${cat.color}0a`,
                      borderColor: `${cat.color}25`,
                    }}
                  >
                    <LayoutTemplate className="h-5 w-5" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider text-foreground">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Recent Stories & Timelines
            </h2>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-black/30 py-16 text-center">
                <Film className="mb-3 h-8 w-8 text-muted animate-pulse" />
                <p className="text-xs font-mono uppercase tracking-wider text-muted">No projects found. Create your first timeline above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/editor/${project.id}`}
                    className="group flex flex-col rounded-xl border border-border/80 bg-black/35 p-4 transition-all duration-300 hover:border-accent hover:bg-black/60 shadow-lg hover:shadow-accent/5 cursor-pointer"
                  >
                    <div className="mb-3.5 flex h-28 items-center justify-center rounded-lg bg-black/45 border border-border/50 group-hover:border-accent/25 transition duration-300">
                      <Film className="h-6 w-6 text-muted group-hover:text-accent group-hover:scale-105 transition-all duration-300" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-wider text-foreground group-hover:text-accent transition duration-200">{project.title}</h3>
                        <p className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{project.format || "Shorts"} · {project.status || "Draft"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-2">
              <LayoutTemplate className="h-3.5 w-3.5" /> Template Categories
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-2 ed-scrollbar">
              {templateCategories.map((cat) => (
                <button
                  key={cat.label}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-black/30 px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/5 transition duration-200 cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
