"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <main className="cmd-panel relative z-10 w-full max-w-[420px] overflow-hidden rounded-xl p-8">
        <div className="pointer-events-none absolute inset-0 border border-accent/10" />
        <div className="relative text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white/5">
            <KeyRound className="h-5 w-5 text-accent" />
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            SceneBook
          </h1>
          <p className="cmd-label mt-2">Dispatched Reset Link</p>
        </div>

        {success ? (
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-[var(--accent-secondary)]">
              A recovery link has been dispatched to your email address if it is registered in our database.
            </p>
            <p className="text-xs text-muted">
              Please click the link in your email to choose a new passkey.
            </p>
            <div className="pt-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition hover:text-accent"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-5">
            <label className="block">
              <span className="cmd-label">Registered Email</span>
              <Input
                className="mt-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="creator@scenebook.io"
                type="email"
                required
              />
            </label>

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <Button
              className="w-full"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!email) {
                  setError("Email is required.");
                  return;
                }
                startTransition(async () => {
                  try {
                    setError(null);
                    const client = createSupabaseBrowserClient();
                    const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });

                    if (resetError) {
                      throw resetError;
                    }

                    setSuccess(true);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Unable to request reset link.");
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
              Dispatch recovery link
            </Button>

            <div className="mt-5 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition hover:text-accent"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted/60">
          v 2.4.1 - secure terminal
        </p>
      </main>
    </div>
  );
}
