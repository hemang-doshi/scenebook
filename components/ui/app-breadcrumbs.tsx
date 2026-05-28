"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

type BreadcrumbPart = {
  label: string;
  href?: string;
};

export function AppBreadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbPart[];
  className?: string;
}) {
  return (
    <motion.div
      key={items.map((item) => item.label).join("/")}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
    >
      <Breadcrumb>
        <BreadcrumbList className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--muted)] tracking-wider uppercase">
          {items.map((item, index) => (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem className="flex items-center">
                {item.href ? (
                  <BreadcrumbLink asChild className="hover:text-[var(--ink)] transition-colors cursor-pointer">
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-semibold text-[var(--ink)]">{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 ? (
                <span className="text-[var(--hairline)] select-none ml-1">/</span>
              ) : null}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </motion.div>
  );
}
