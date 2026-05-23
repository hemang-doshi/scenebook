"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Home, Inbox, Settings2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/board", label: "Board", icon: Film },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass-card hidden w-72 shrink-0 rounded-[34px] p-5 lg:flex lg:flex-col"
      >
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              SceneBook
            </p>
            <h1 className="editorial-heading mt-2 text-3xl text-foreground">
              Private creator studio
            </h1>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {active ? <span className="h-2 w-2 rounded-full bg-current" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[28px] border border-border bg-white/55 p-4">
          <Badge>Sample mode ready</Badge>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Build the idea-to-learning loop before wiring a live Supabase project.
          </p>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="glass-card flex items-center justify-between rounded-[30px] px-5 py-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Focus for today
            </p>
            <p className="mt-1 text-sm text-foreground">
              Capture faster, ship cleaner, learn from every post.
            </p>
          </div>
          <Badge>Creator-owned workflow</Badge>
        </motion.header>

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
