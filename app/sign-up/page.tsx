"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-xl p-8 lg:p-10">
        <p className="cmd-label">Create account</p>
        <h1 className="cmd-title mt-4 text-4xl font-semibold">Bring your studio online</h1>
        <div className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Email
            <Input
              className="mt-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Password
            <Input
              className="mt-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <Button
            className="w-full"
            onClick={() =>
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
                  setError(
                    caught instanceof Error ? caught.message : "Unable to sign up.",
                  );
                }
              })
            }
            disabled={isPending}
          >
            Create account
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          Already set up? <Link className="text-foreground" href="/sign-in">Sign in</Link>
        </p>
      </Panel>
    </div>
  );
}
