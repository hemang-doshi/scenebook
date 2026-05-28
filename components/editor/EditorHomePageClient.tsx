"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Film, Plus, Clock, LayoutTemplate, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { useEditorStore } from "@/lib/editor/editor-store";
import type { ProjectSummary } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";

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
    <div className="relative flex min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 flex-1 flex flex-col overflow-auto scrollbar-thin"
      >
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-8 py-6 bg-[var(--canvas)] shrink-0">
          <div>
            <AppBreadcrumbs
              items={[{ label: "Projects", href: "/home" }, { label: "Editor" }]}
            />
            <span className="mt-4 inline-block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] font-semibold">Video Studio</span>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] mt-0.5">Project Deck</h1>
          </div>
          <Link href="/home">
            <Button variant="secondary" className="h-9 px-4 text-xs border-[var(--hairline)]">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Dashboard
            </Button>
          </Link>
        </header>

        <div className="flex-1 px-8 py-8 space-y-8 max-w-7xl w-full mx-auto">
          <section className="space-y-4">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> Start Designing
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/editor/new"
                className="group flex flex-col items-center justify-center gap-3 rounded-[var(--rounded-lg)] border border-dashed border-[var(--hairline)] bg-[var(--canvas)] p-8 transition-colors duration-250 hover:bg-[var(--surface-soft)] hover:border-[var(--ink)] cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--rounded-md)] bg-[var(--surface-soft)] border border-[var(--hairline)] text-[var(--ink)] transition duration-200 group-hover:scale-105">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink)]">Blank Project</span>
              </Link>
              {templateCategories.slice(0, 3).map((cat) => (
                <button
                  key={cat.label}
                  className="group flex flex-col items-center justify-center gap-3 rounded-[var(--rounded-lg)] border border-[var(--hairline)] bg-[var(--canvas)] p-8 transition-colors duration-250 hover:bg-[var(--surface-soft)] cursor-pointer"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--hairline)]"
                    style={{
                      background: `${cat.color}0a`,
                    }}
                  >
                    <LayoutTemplate className="h-5 w-5" style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink)]">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Recent Stories & Timelines
            </h2>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[var(--rounded-lg)] border border-dashed border-[var(--hairline)] bg-[var(--surface-soft)]/30 py-16 text-center">
                <Film className="mb-3 h-8 w-8 text-[var(--muted)] animate-pulse" />
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">No projects found. Create your first timeline above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/editor/${project.id}`}
                    className="group flex flex-col rounded-[var(--rounded-lg)] border border-[var(--hairline)] bg-[var(--canvas)] p-4 transition-all duration-200 hover:border-[var(--ink)] hover:bg-[var(--surface-soft)]/30 cursor-pointer"
                  >
                    <div className="mb-3.5 flex h-28 items-center justify-center rounded-[var(--rounded-md)] bg-[var(--surface-soft)] border border-[var(--hairline)] transition duration-200">
                      <Film className="h-6 w-6 text-[var(--muted)] group-hover:text-[var(--ink)] group-hover:scale-105 transition-all duration-200" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--ink)] group-hover:text-[var(--ink)] transition duration-200">{project.title}</h3>
                        <p className="mt-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--muted)]">{project.format || "Shorts"} · {project.status || "Draft"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--ink)] group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
              <LayoutTemplate className="h-3.5 w-3.5" /> Template Categories
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {templateCategories.map((cat) => (
                <button
                  key={cat.label}
                  className="flex shrink-0 items-center gap-2 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] px-4 py-2 text-xs font-mono uppercase tracking-wider text-[var(--ink)]/80 hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition duration-150 cursor-pointer"
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
