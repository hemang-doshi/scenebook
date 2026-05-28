import { createClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SeedDevTestUserInput = {
  email: string;
  password: string;
};

type SeedDevTestUserResult = {
  action: "created" | "updated";
  email: string;
};

export async function seedDevTestUser(
  input: SeedDevTestUserInput,
): Promise<SeedDevTestUserResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !publishableKey) {
      throw new Error("Supabase client requested without configured env.");
    }

    const publicClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await publicClient.auth.signUp({
      email: normalizedEmail,
      password: input.password,
      options: {
        data: { seededBy: "dev-route" },
      },
    });

    if (error) {
      throw error;
    }

    return {
      action: "created",
      email: normalizedEmail,
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }

  const existingUser = listData.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  );

  if (!existingUser) {
    const { error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: { seededBy: "dev-route" },
    });

    if (error) {
      throw error;
    }

    return {
      action: "created",
      email: normalizedEmail,
    };
  }

  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password: input.password,
    email_confirm: true,
    user_metadata: { seededBy: "dev-route" },
  });

  if (error) {
    throw error;
  }

  return {
    action: "updated",
    email: normalizedEmail,
  };
}
