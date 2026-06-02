"use client";

import { motion } from "motion/react";

import { Empty } from "@/components/ui/empty";

export function EmptyAgentState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center"
    >
      <Empty className="w-full max-w-2xl border-[var(--line)] bg-[rgba(255,255,255,.045)] px-6 py-8 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-3xl font-semibold tracking-normal text-[var(--ink)]">
          What should we build in SceneBook?
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Start with a direct prompt or use a slash command when you need a structured action.
        </p>
      </Empty>
    </motion.div>
  );
}
