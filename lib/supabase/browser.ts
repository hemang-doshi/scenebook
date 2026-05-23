"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase browser client requested without configured env.");
  }

  if (!client) {
    client = createBrowserClient<Database>(
      env.supabaseUrl,
      env.supabasePublishableKey,
    );
  }

  return client;
}
