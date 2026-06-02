import { motion } from "motion/react";

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mb-8"
    >
      <div className="type-eyebrow mb-2 text-[12px] uppercase tracking-[0.08em] text-[var(--blue-2)]">{eyebrow}</div>
      <h1 className="type-display-lg mb-3 font-bold tracking-normal text-[var(--ink)]">{title}</h1>
      <p className="type-body max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
    </motion.div>
  );
}
