"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignUpPage() {
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
            Create Account
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">
            Bring your studio online
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
            <label htmlFor="password" className="block text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
              Password
            </label>
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
                  const { error: signUpError } = await client.auth.signUp({
                    email,
                    password,
                  });

                  if (signUpError) {
                    throw signUpError;
                  }

                  router.push("/home");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to sign up.");
                }
              });
            }}
            type="submit"
          >
            {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Already set up?{" "}
          <Link className="text-[var(--ink)] font-semibold hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
