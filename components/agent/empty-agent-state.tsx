"use client";

import { motion } from "motion/react";

import { Empty } from "@/components/ui/empty";

export function EmptyAgentState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-4 flex-1 text-center"
    >
      <Empty className="w-full max-w-2xl border-accent/15 bg-black/15 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          What should we build in SceneBook?
        </h1>
        <p className="mt-3 text-sm text-muted">
          Start with a direct prompt or use a slash command when you need a structured action.
        </p>
      </Empty>
    </motion.div>
  );
}
