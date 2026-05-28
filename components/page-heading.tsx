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
      <div className="type-eyebrow text-[var(--muted)] text-[12px] uppercase tracking-[0.08em] mb-2">{eyebrow}</div>
      <h1 className="type-display-lg text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink)] mb-3">{title}</h1>
      <p className="type-body text-sm md:text-base text-[var(--muted)] leading-relaxed max-w-3xl">
        {description}
      </p>
    </motion.div>
  );
}
