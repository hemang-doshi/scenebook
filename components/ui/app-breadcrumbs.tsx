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
  BreadcrumbSeparator,
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={className}
    >
      <Breadcrumb>
        <BreadcrumbList className="cmd-breadcrumb min-h-11 rounded-full border border-border/70 bg-background/80 px-4 py-2 backdrop-blur-xl">
          {items.map((item, index) => (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 ? <BreadcrumbSeparator /> : null}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </motion.div>
  );
}
