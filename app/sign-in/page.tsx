"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-5xl overflow-hidden rounded-[40px] p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden bg-[#173428] p-8 text-[#f6eee3] lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(195,111,60,0.26),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_40%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d7c9b4]">
                SceneBook
              </p>
              <h1 className="editorial-heading mt-6 max-w-xl text-5xl leading-tight">
                The private studio where one idea becomes a finished learning loop.
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-[#d7c9b4]">
                Capture the spark, shape the script, prep the shoot, log the result, and
                keep the next idea ready before your momentum drops.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button onClick={() => router.push("/home")}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enter sample studio
                </Button>
                <Button variant="secondary" onClick={() => router.push("/board")}>
                  See the board
                </Button>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sign in
            </p>
            <h2 className="editorial-heading mt-4 text-3xl text-foreground">
              Resume your creator system
            </h2>
            <div className="mt-8 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Email
                <Input
                  className="mt-2"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Password
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
                onClick={() =>
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
                      setError(
                        caught instanceof Error ? caught.message : "Unable to sign in.",
                      );
                    }
                  })
                }
              >
                {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Need an account? <Link className="text-accent" href="/sign-up">Create one</Link>
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
