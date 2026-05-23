"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Sparkles, TestTube2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <main className="cmd-panel relative z-10 w-full max-w-[420px] overflow-hidden rounded-xl p-8">
        <div className="pointer-events-none absolute inset-0 border border-accent/10" />
        <div className="relative text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white/5">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            SceneBook
          </h1>
          <p className="cmd-label mt-2">Command Center</p>
        </div>

        <form className="mt-8 space-y-5">
          <label className="block">
            <span className="cmd-label">Identity</span>
            <Input
              className="mt-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="creator@scenebook.io"
              type="email"
            />
          </label>

          <label className="block">
            <span className="cmd-label">Passkey</span>
            <Input
              className="mt-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </label>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <Button
            className="w-full"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                if (env.isSampleMode) {
                  router.push("/home");
                  return;
                }

                try {
                  const client = createSupabaseBrowserClient();
                  const { error: signInError } = await client.auth.signInWithPassword({
                    email,
                    password,
                  });

                  if (signInError) {
                    throw signInError;
                  }

                  router.push("/home");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to sign in.");
                }
              });
            }}
            type="submit"
          >
            {isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Initialize session
          </Button>
        </form>

        <div className="relative my-6">
          <div className="border-t border-border" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            or
          </span>
        </div>

        <Button className="w-full" variant="secondary" onClick={() => router.push("/home")}>
          <TestTube2 className="mr-2 h-4 w-4" />
          Enter sample studio
        </Button>

        <div className="mt-5 text-center">
          <button
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition hover:text-accent"
            onClick={() => router.push("/board")}
            type="button"
          >
            <Sparkles className="h-4 w-4 text-[var(--accent-secondary)]" />
            See the board
          </button>
        </div>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted/60">
          v 2.4.1 - secure terminal
        </p>
      </main>

      <p className="absolute bottom-8 text-sm text-muted">
        Need an account? <Link className="text-foreground" href="/sign-up">Create one</Link>
      </p>
    </div>
  );
}
