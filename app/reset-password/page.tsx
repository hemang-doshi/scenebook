"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const client = createSupabaseBrowserClient();

  useEffect(() => {
    // Check initial user status
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        setHasSession(true);
      }
      setLoading(false);
    });

    // Subscribe to state updates in case the token exchange resolves asynchronously
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

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
          <p className="cmd-label mt-2">Initialize New Passkey</p>
        </div>

        {loading ? (
          <div className="mt-10 flex flex-col items-center justify-center space-y-4">
            <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted">Checking terminal session...</p>
          </div>
        ) : !hasSession ? (
          <div className="mt-8 text-center space-y-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-sm text-[var(--danger)]">
              Invalid or expired recovery session.
            </p>
            <p className="text-xs text-muted">
              Please request a new link to securely reset your passkey.
            </p>
            <div className="pt-4">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition hover:text-accent"
              >
                Request recovery link
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-[var(--accent-secondary)]">
              Passkey updated successfully!
            </p>
            <p className="text-xs text-muted">
              Your security session is initialized. Redirecting to workspace...
            </p>
            <div className="pt-4">
              <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[var(--accent-secondary)]" />
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-5">
            <label className="block">
              <span className="cmd-label">New Passkey</span>
              <Input
                className="mt-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                required
              />
            </label>

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <Button
              className="w-full"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                if (password.length < 6) {
                  setError("Passkey must be at least 6 characters.");
                  return;
                }
                startTransition(async () => {
                  try {
                    setError(null);
                    const { error: updateError } = await client.auth.updateUser({
                      password,
                    });

                    if (updateError) {
                      throw updateError;
                    }

                    setSuccess(true);
                    setTimeout(() => {
                      router.push("/home");
                    }, 2000);
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "Unable to update passkey.",
                    );
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
              Initialize passkey
            </Button>
          </form>
        )}

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted/60">
          v 2.4.1 - secure terminal
        </p>
      </main>
    </div>
  );
}
