import { requireOwnedProject, type SupabaseOwnershipClient } from "@/lib/auth/ownership";
import { requireServerUser, type SupabaseAuthClient } from "@/lib/auth/server-user";

export type AccountRole = "owner" | "editor" | "viewer";

export type PermissionSummary = {
  canReadProject: boolean;
  canWriteProject: boolean;
  canApplyPatch: boolean;
  canManageIntegrations: boolean;
};

export type AccountContext = {
  userId: string;
  projectId?: string;
  workspaceId?: string | null;
  role: AccountRole;
  permissions: PermissionSummary;
};

export type AccountContextSupabaseClient = SupabaseAuthClient & SupabaseOwnershipClient;

function permissionsForRole(role: AccountRole): PermissionSummary {
  return {
    canReadProject: role === "owner" || role === "editor" || role === "viewer",
    canWriteProject: role === "owner" || role === "editor",
    canApplyPatch: role === "owner" || role === "editor",
    canManageIntegrations: role === "owner",
  };
}

export async function loadAccountContext(input: {
  projectId?: string;
  userId?: string;
  supabase?: AccountContextSupabaseClient;
}): Promise<AccountContext> {
  const user = input.userId
    ? { id: input.userId }
    : await requireServerUser({ supabase: input.supabase });

  if (!input.projectId) {
    return {
      userId: user.id,
      workspaceId: null,
      role: "owner",
      permissions: permissionsForRole("owner"),
    };
  }

  await requireOwnedProject({
    supabase: input.supabase,
    projectId: input.projectId,
    userId: user.id,
  });

  return {
    userId: user.id,
    projectId: input.projectId,
    workspaceId: null,
    role: "owner",
    permissions: permissionsForRole("owner"),
  };
}
