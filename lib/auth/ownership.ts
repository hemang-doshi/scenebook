import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OwnedProjectRow = {
  id: string;
  owner_id: string;
};

type SupabaseProjectSelectChain<T> = {
  eq(column: string, value: string): SupabaseProjectSelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | Record<string, unknown> | null; error: Error | null }>;
};

export type SupabaseOwnershipClient = {
  from(table: "content_cards" | string): {
    select(columns: string): SupabaseProjectSelectChain<OwnedProjectRow>;
  };
};

export class ProjectOwnershipError extends Error {
  status = 404;

  constructor(message = "Project not found.") {
    super(message);
    this.name = "ProjectOwnershipError";
  }
}

export async function getOwnedProject(input: {
  projectId: string;
  userId: string;
  supabase?: SupabaseOwnershipClient;
}) {
  const supabase =
    input.supabase ?? ((await createSupabaseServerClient()) as unknown as SupabaseOwnershipClient);
  const { data, error } = await supabase
    .from("content_cards")
    .select("id, owner_id")
    .eq("id", input.projectId)
    .eq("owner_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as OwnedProjectRow | null;
}

export async function requireOwnedProject(input: {
  projectId: string;
  userId: string;
  supabase?: SupabaseOwnershipClient;
}) {
  const project = await getOwnedProject(input);

  if (!project) {
    throw new ProjectOwnershipError();
  }

  return project;
}
