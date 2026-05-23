"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Clapperboard,
  Home,
  Inbox,
  Search,
  Settings2,
  Sparkles,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Dashboard", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/board", label: "Board", icon: Clapperboard },
  { href: "/studio/card-1", label: "Studio", icon: Video, match: ["/studio", "/cards"] },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="cmd-panel-soft hidden w-[260px] shrink-0 border-r lg:flex lg:flex-col"
      >
        <div className="border-b border-border px-6 py-6">
          <p className="text-xl font-semibold tracking-tight text-foreground">SceneBook</p>
          <p className="cmd-label mt-2">Command Center</p>
        </div>

        <div className="px-6 py-5">
          <p className="cmd-label">Current Project</p>
          <p className="mt-3 truncate text-lg font-semibold text-accent">
            Sony A7IV Cinematic Settings
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(212,255,51,0.55)]" />
            Editing
          </p>
        </div>

        <nav className="space-y-1 px-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              item.match?.some((match) => pathname.startsWith(match));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-r-2 border-transparent px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-6 pb-4">
          <Button className="w-full justify-center">
            <Sparkles className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>

        <div className="border-t border-border px-4 py-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            Preferences
          </Link>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-5 py-4 backdrop-blur-xl lg:px-8"
        >
          <div className="flex items-center gap-5">
            <nav className="hidden items-center gap-5 lg:flex">
              <Link className="cmd-label text-muted transition hover:text-foreground" href="/inbox">
                Inbox
              </Link>
              <Link className="cmd-label text-muted transition hover:text-foreground" href="/board">
                Board
              </Link>
              <span className="cmd-label text-muted">Schedule</span>
            </nav>
            <div className="relative hidden lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="w-72 pl-9" placeholder="Search project..." />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-full border border-border p-2 text-muted transition hover:bg-white/5 hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
            <Badge>Sample mode</Badge>
          </div>
        </motion.header>

        <main className="min-h-0 flex-1 px-5 py-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
