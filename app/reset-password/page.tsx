"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, ShieldAlert } from "lucide-react";

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
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        setHasSession(true);
      }
      setLoading(false);
    });

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
    <div className="flex min-h-screen bg-[var(--canvas)] items-center justify-center px-4 py-12">
      <main className="w-full max-w-[420px] bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-8 md:p-10">
        <div className="text-center mb-8">
          <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-2">
            Reset Password
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--ink)]">
            SceneBook
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--ink)]" />
            <p className="text-sm text-[var(--muted)]">Checking session...</p>
          </div>
        ) : !hasSession ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[var(--danger)]">
              Invalid or expired recovery session.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Please request a new link to securely reset your password.
            </p>
            <div className="pt-4">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[var(--ink)] hover:underline"
              >
                Request recovery link
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-[var(--ink)] font-semibold">
              Password updated successfully!
            </p>
            <p className="text-xs text-[var(--muted)]">
              Redirecting to workspace...
            </p>
            <div className="pt-4">
              <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[var(--ink)]" />
            </div>
          </div>
        ) : (
          <form className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
                New Password
              </label>
              <Input
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
                if (password.length < 6) {
                  setError("Password must be at least 6 characters.");
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
                        : "Unable to update password.",
                    );
                  }
                });
              }}
              type="submit"
            >
              {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
