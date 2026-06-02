import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServerUser = {
  id: string;
  email?: string | null;
};

export type SupabaseAuthClient = {
  auth: {
    getUser(): PromiseLike<{ data: { user: ServerUser | null } }>;
  };
};

export class AuthRequiredError extends Error {
  status = 401;

  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export async function getServerUser(input: { supabase?: SupabaseAuthClient } = {}) {
  const supabase = input.supabase ?? ((await createSupabaseServerClient()) as unknown as SupabaseAuthClient);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireServerUser(input: { supabase?: SupabaseAuthClient } = {}) {
  const user = await getServerUser(input);

  if (!user) {
    throw new AuthRequiredError();
  }

  return user;
}
