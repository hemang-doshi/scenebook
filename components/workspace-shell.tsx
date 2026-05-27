"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Film,
  FolderKanban,
  Home,
  LogOut,
  MessageSquare,
  Search,
  Settings2,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { env } from "@/lib/env";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";

const AuroraBackground = dynamic(
  () => import("@/components/ui/aurora-background").then((mod) => mod.AuroraBackground),
  { ssr: false },
);
const RetroGrid = dynamic(
  () => import("@/components/ui/retro-grid").then((mod) => mod.RetroGrid),
  { ssr: false },
);

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentProject, setCurrentProject] = useState<{
    id: string;
    title: string;
    status: keyof typeof statusLabels;
  } | null>(null);

  const cardIdMatch = pathname.match(/^\/(cards|studio|projects|editor)\/([^/]+)/);
  const activeCardId = cardIdMatch ? cardIdMatch[2] : null;
  const showActiveProject = Boolean(activeCardId && activeCardId !== "new");

  const items = [
    { href: "/home", label: "Projects", icon: Home },
    ...(showActiveProject
      ? [
          {
            href: `/projects/${activeCardId}`,
            label: "Project Hub",
            icon: FolderKanban,
            match: [`/cards/${activeCardId}`, `/studio/${activeCardId}`],
          },
          {
            href: `/projects/${activeCardId}/chat`,
            label: "Agent",
            icon: MessageSquare,
            match: [`/projects/${activeCardId}/chat`],
          },
        ]
      : []),
    { href: "/editor", label: "Editor", icon: Film, match: ["/editor"] },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings2 },
  ];

  const visibleProject = activeCardId && activeCardId !== "new" ? currentProject : null;
  const projectTitle = visibleProject ? visibleProject.title : "No active project";
  const projectStatus = visibleProject ? statusLabels[visibleProject.status] : "Idle";
  const accountLabel = accountEmail ?? "Signed in";
  const accountSubLabel = accountEmail ? "Workspace session" : "Supabase workspace";

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    client.auth.getUser().then(({ data: authData }) => {
      setAccountEmail(authData.user?.email ?? null);
    }).catch(() => {
      setAccountEmail(null);
    });
  }, []);

  useEffect(() => {
    if (!activeCardId || activeCardId === "new") {
      return;
    }

    let active = true;
    fetchJson<{ id: string; title: string; status: keyof typeof statusLabels }>(
      `/api/projects/${activeCardId}/summary`,
    )
      .then((project) => {
        if (active) {
          setCurrentProject(project);
        }
      })
      .catch(() => {
        if (active) {
          setCurrentProject(null);
        }
      });

    return () => {
      active = false;
    };
  }, [activeCardId]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const client = createSupabaseBrowserClient();
      await client.auth.signOut();
      router.replace("/sign-in");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const breadcrumbItems = useMemo(() => {
    if (pathname === "/home") return [{ label: "Projects" }];
    if (pathname === "/analytics") return [{ label: "Analytics" }];
    if (pathname === "/settings") return [{ label: "Settings" }];
    if (pathname === "/editor") {
      return [{ label: "Projects", href: "/home" }, { label: "Editor" }];
    }
    if (pathname.startsWith("/editor/")) {
      if (showActiveProject) {
        return [
          { label: "Projects", href: "/home" },
          { label: projectTitle, href: `/projects/${activeCardId}/chat` },
          { label: "Editor" },
        ];
      }
      return [{ label: "Projects", href: "/home" }, { label: "Editor" }];
    }
    if (pathname.startsWith("/projects/") && pathname.endsWith("/chat")) {
      return [
        { label: "Projects", href: "/home" },
        { label: projectTitle, href: `/projects/${activeCardId}` },
        { label: "Agent" },
      ];
    }
    if (pathname.startsWith("/projects/")) {
      return [{ label: "Projects", href: "/home" }, { label: projectTitle }];
    }
    return [{ label: "Projects", href: "/home" }];
  }, [activeCardId, pathname, projectTitle, showActiveProject]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background/50 text-foreground">
      <AuroraBackground />
      <RetroGrid className="opacity-20" />
      <div className="relative z-10 min-h-screen">
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <motion.aside
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0, width: isCollapsed ? 92 : 280 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="cmd-island fixed left-6 top-6 bottom-6 z-30 hidden overflow-hidden rounded-[2rem] lg:flex"
          >
            <div className="flex h-full w-full flex-col justify-between p-3">
              <div className="flex flex-col gap-4">
                <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between px-2 pt-1")}>
                  {isCollapsed ? null : (
                    <div>
                      <p className="text-base font-semibold tracking-tight text-foreground">SceneBook</p>
                      <p className="cmd-label mt-1">Workspace</p>
                    </div>
                  )}
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                      className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-black/20 text-muted transition hover:bg-white/5 hover:text-foreground"
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent forceMount className={cn("overflow-hidden data-[state=closed]:animate-[ed-fadeIn_0.2s_ease-out]", isCollapsed && "hidden")}>
                  <div className="rounded-[1.5rem] border border-border/60 bg-black/18 px-4 py-4">
                    <p className="cmd-label">Current Project</p>
                    <p className="mt-3 truncate text-base font-semibold text-foreground" title={projectTitle}>
                      {projectTitle}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          visibleProject ? "bg-accent shadow-[0_0_12px_rgba(99,102,241,0.55)]" : "bg-zinc-600"
                        )}
                      />
                      {projectStatus}
                    </p>
                  </div>
                </CollapsibleContent>

                <nav className="flex flex-col gap-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      (item.match && item.match.some((match) => pathname.startsWith(match)));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center rounded-[1.25rem] border border-transparent px-3 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition",
                          isCollapsed ? "justify-center" : "gap-3",
                          active
                            ? "border-accent/20 bg-accent/10 text-accent shadow-[0_0_24px_rgba(99,102,241,0.14)]"
                            : "text-muted hover:border-border/60 hover:bg-white/5 hover:text-foreground",
                        )}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {isCollapsed ? null : <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </nav>

                <Separator className="bg-border/70" />

                <Link href="/home?create=1">
                  <Button
                    className={cn(
                      "w-full rounded-[1.25rem] justify-center",
                      isCollapsed ? "px-0" : "px-4",
                    )}
                    title="New project"
                  >
                    <Sparkles className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
                    {isCollapsed ? null : "New project"}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                <Separator className="bg-border/70" />
                <div className={cn("flex items-center gap-3 rounded-[1.5rem] border border-border/60 bg-black/18 px-3 py-3", isCollapsed && "justify-center px-2")}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white/5 text-muted">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                  {isCollapsed ? null : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{accountLabel}</p>
                      <p className="truncate text-xs text-muted">{accountSubLabel}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-full border border-border/70 bg-black/20 px-3 text-[10px] text-muted hover:border-border hover:bg-white/5 hover:text-foreground",
                    isCollapsed ? "justify-center px-0" : "justify-center",
                  )}
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut className={cn("h-3.5 w-3.5", isCollapsed ? "" : "mr-2")} />
                  {isCollapsed ? null : isSigningOut ? "Signing out" : "Sign out"}
                </Button>
              </div>
            </div>
          </motion.aside>
        </Collapsible>

        <div className={cn("flex min-h-screen flex-col transition-[padding] duration-300 ease-out", isCollapsed ? "lg:pl-[8.5rem]" : "lg:pl-[19rem]")}>
          <div className="sticky top-0 z-20 px-4 pt-4 lg:px-6 lg:pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <AppBreadcrumbs items={breadcrumbItems} className="min-w-0" />
                <div className="hidden items-center gap-3 lg:flex">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input className="w-72 rounded-full border-border/70 bg-background/75 pl-9" placeholder="Search projects..." />
                  </div>
                  <button className="rounded-full border border-border/70 bg-background/75 p-2 text-muted transition hover:bg-white/5 hover:text-foreground">
                    <Bell className="h-4 w-4" />
                  </button>
                  {env.isSampleMode ? (
                    <Badge>Sample mode</Badge>
                  ) : (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">Supabase Mode</Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="w-full whitespace-nowrap lg:hidden">
                <div className="flex gap-2 pb-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      (item.match && item.match.some((match) => pathname.startsWith(match)));

                    return (
                      <Link
                        key={`${item.href}-mobile`}
                        href={item.href}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] transition",
                          active
                            ? "border-accent/20 bg-accent/10 text-accent"
                            : "border-border/70 bg-background/75 text-muted",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <main className="min-h-0 flex-1 px-4 pb-6 pt-5 lg:px-6 lg:pb-8 lg:pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
