import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="mb-5"
    >
      <Badge>{eyebrow}</Badge>
      <h1 className="editorial-heading mt-4 text-4xl text-foreground">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </motion.div>
  );
}
