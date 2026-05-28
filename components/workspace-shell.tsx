"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Home,
  FolderKanban,
  MessageSquare,
  Film,
  BarChart3,
  Settings2,
} from "lucide-react";

import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="relative min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col font-sans">
      {/* Sticky Top Nav */}
      <header className="sticky top-0 z-40 h-14 w-full bg-[var(--canvas)] border-b border-[var(--hairline)] px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Logo + Breadcrumbs */}
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/home" className="text-lg font-bold tracking-tight text-[var(--ink)] hover:opacity-80 transition-opacity shrink-0">
            SceneBook
          </Link>
          {breadcrumbItems.length > 0 && (
            <>
              <span className="text-[var(--hairline)] select-none">/</span>
              <AppBreadcrumbs items={breadcrumbItems} className="min-w-0" />
            </>
          )}
        </div>

        {/* Center: Nav links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.match && item.match.some((m) => pathname.startsWith(m)));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-xs font-mono tracking-wider uppercase transition-colors py-1",
                  active
                    ? "text-[var(--ink)] font-bold border-b-2 border-[var(--ink)]"
                    : "text-[var(--ink)]/60 hover:text-[var(--ink)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* New Project (Desktop) */}
          <Link href="/home?create=1" className="hidden sm:block">
            <Button variant="primary" className="h-9 px-4 text-xs font-medium">
              New project
            </Button>
          </Link>

          {/* User Email (Desktop/Tablet) */}
          {accountEmail && (
            <div className="hidden lg:block text-xs font-mono text-[var(--ink)]/60 bg-[var(--surface-soft)] px-3 py-1.5 rounded-[var(--rounded-md)] border border-[var(--hairline)]">
              {accountEmail}
            </div>
          )}

          {/* Sign Out (Desktop) */}
          <Button
            variant="secondary"
            className="hidden sm:inline-flex h-9 px-4 text-xs font-medium"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-[var(--ink)] hover:bg-[var(--surface-soft)] rounded-[var(--rounded-md)] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Marquee Strip */}
      <div className="marquee-strip relative flex items-center w-full border-b border-[var(--hairline)]">
        <div className="marquee-track flex whitespace-nowrap text-[10px] font-mono tracking-widest py-2 select-none uppercase">
          <span>SCENEBOOK AI &bull; WRITE SCRIPTS &bull; GENERATE STORYBOARDS &bull; REFINE SCENES &bull; EXPORT VIDEO &bull;&nbsp;</span>
          <span>SCENEBOOK AI &bull; WRITE SCRIPTS &bull; GENERATE STORYBOARDS &bull; REFINE SCENES &bull; EXPORT VIDEO &bull;&nbsp;</span>
          <span>SCENEBOOK AI &bull; WRITE SCRIPTS &bull; GENERATE STORYBOARDS &bull; REFINE SCENES &bull; EXPORT VIDEO &bull;&nbsp;</span>
          <span>SCENEBOOK AI &bull; WRITE SCRIPTS &bull; GENERATE STORYBOARDS &bull; REFINE SCENES &bull; EXPORT VIDEO &bull;&nbsp;</span>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[92px] z-30 bg-[var(--canvas)] flex flex-col p-6 animate-[ed-fadeIn_0.15s_ease-out]">
          <nav className="flex flex-col gap-4 mb-8">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.match && item.match.some((m) => pathname.startsWith(m)));
              return (
                <Link
                  key={`${item.href}-mobile`}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "text-lg font-semibold tracking-tight py-2 border-b border-[var(--hairline)]",
                    active ? "text-[var(--primary)]" : "text-[var(--ink)]/60"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-3 mt-auto">
            {accountEmail && (
              <div className="text-xs font-mono text-center text-[var(--ink)]/60 bg-[var(--surface-soft)] py-2 rounded-[var(--rounded-md)] border border-[var(--hairline)]">
                {accountEmail}
              </div>
            )}
            <Link href="/home?create=1" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
              <Button variant="primary" className="w-full h-10 justify-center">
                New project
              </Button>
            </Link>
            <Button
              variant="secondary"
              className="w-full h-10 justify-center"
              disabled={isSigningOut}
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleSignOut();
              }}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-[var(--canvas)]">
        {children}
      </main>
    </div>
  );
}
