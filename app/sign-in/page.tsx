"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] items-center justify-center px-4 py-12">
      <main className="w-full max-w-[420px] bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-8 md:p-10">
        <div className="text-center mb-8">
          <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-2">
            Workspace Portal
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--ink)]">
            SceneBook
          </h1>
        </div>

        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
              Email
            </label>
            <Input
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="creator@scenebook.io"
              type="email"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                Password
              </label>
              <Link
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] underline underline-offset-4 transition-colors"
                href="/forgot-password"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              type="password"
              required
            />
          </div>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <Button
            className="w-full justify-center"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
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
            {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--hairline)] text-center">
          <button
            className="text-xs font-mono uppercase tracking-wider text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            onClick={() => router.push("/board")}
            type="button"
          >
            See the Kanban Board
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Need an account?{" "}
          <Link className="text-[var(--ink)] font-semibold hover:underline" href="/sign-up">
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}
