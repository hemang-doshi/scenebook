"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] items-center justify-center px-4 py-12">
      <main className="w-full max-w-[420px] bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-8 md:p-10">
        <div className="text-center mb-8">
          <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-2">
            Password Recovery
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--ink)]">
            SceneBook
          </h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-[var(--ink)]">
              A recovery link has been dispatched to your email address if it is registered in our database.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Please click the link in your email to choose a new passkey.
            </p>
            <div className="pt-4">
              <Link
                href="/sign-in"
                className="text-xs font-semibold text-[var(--ink)] hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
                Registered Email
              </label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="creator@scenebook.io"
                type="email"
                required
              />
            </div>

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <Button
              className="w-full justify-center"
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
              {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Send recovery link
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/sign-in"
                className="text-xs font-semibold text-[var(--ink)] hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
