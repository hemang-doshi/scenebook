"use client";

import type React from "react";
import { useEffect, useState } from "react";
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

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchJson } from "@/lib/fetcher";

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
    status: string;
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
    fetchJson<{ id: string; title: string; status: string }>(
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

  return (
    <div
      className="relative flex min-h-screen flex-col bg-transparent text-[var(--ink)] font-sans"
    >
      <header className="sticky top-0 z-40 grid h-[72px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[var(--line)] bg-[rgba(7,8,11,.74)] px-4 backdrop-blur-[18px] lg:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/home" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-normal text-[var(--ink)] transition-opacity hover:opacity-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/scenebook-mark-dark.svg" alt="" className="h-9 w-9" />
            <span className="font-display">SceneBook</span>
          </Link>
          {visibleProject ? (
            <div
              aria-label="Active project context"
              data-active-project-context="true"
              className="hidden min-w-0 items-center gap-2 md:flex"
            >
              <span aria-hidden="true" className="shrink-0 font-mono text-sm text-[var(--muted-2)]">
                /
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {visibleProject.title}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <nav
          aria-label="Primary workspace"
          data-alignment="center"
          className="hidden items-center justify-center gap-2 md:flex"
        >
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.match && item.match.some((m) => pathname.startsWith(m)));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-state={active ? "active" : "inactive"}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-2 text-[11px] font-mono uppercase tracking-[.07em] transition-colors",
                  active
                    ? "border-[var(--coral)]/50 bg-[var(--coral)]/12 text-[var(--coral-2)]"
                    : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:text-[var(--ink)]"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active ? "text-[var(--coral)]" : "text-[var(--muted-2)]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 px-0 py-0 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[72px] z-30 flex flex-col border-t border-[var(--line)] bg-[rgba(7,8,11,.96)] p-6 backdrop-blur-[18px] animate-[ed-fadeIn_0.15s_ease-out] md:hidden">
          {visibleProject ? (
            <Panel
              aria-label="Mobile active project context"
              variant="floating"
              className="mb-6 flex flex-col gap-3 p-4 shadow-none"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="shrink-0 font-mono text-sm text-[var(--muted-2)]">
                  /
                </span>
                <p className="truncate text-base font-semibold text-[var(--ink)]">{visibleProject.title}</p>
              </div>
            </Panel>
          ) : null}

          <nav className="mb-8 flex flex-col gap-4">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.match && item.match.some((m) => pathname.startsWith(m)));
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.href}-mobile`}
                  href={item.href}
                  data-state={active ? "active" : "inactive"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 border-b border-[var(--line)] py-3 text-lg font-semibold tracking-normal",
                    active ? "text-[var(--coral-2)]" : "text-[var(--muted)]"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[var(--coral)]" : "text-[var(--muted-2)]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-3 mt-auto">
            {accountEmail && (
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgba(255,255,255,.045)] py-2 text-center text-xs font-mono text-[var(--muted)]">
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

      <main className="w-full flex-1 bg-transparent">
        {children}
      </main>
    </div>
  );
}
