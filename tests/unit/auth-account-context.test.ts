import { describe, expect, test } from "vitest";

import { loadAccountContext } from "@/lib/auth/account-context";
import { ProjectOwnershipError, requireOwnedProject } from "@/lib/auth/ownership";
import { AuthRequiredError, requireServerUser } from "@/lib/auth/server-user";

function authClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
  };
}

function ownershipClient(row: { id: string; owner_id: string } | null) {
  const filters: Array<[string, string]> = [];

  return {
    filters,
    from: () => ({
      select: () => ({
        eq(column: string, value: string) {
          filters.push([column, value]);
          return this;
        },
        maybeSingle: async () => ({ data: row, error: null }),
      }),
    }),
  };
}

describe("auth/account context", () => {
  test("requireServerUser returns authenticated user", async () => {
    await expect(requireServerUser({ supabase: authClient({ id: "user-1" }) })).resolves.toEqual({
      id: "user-1",
    });
  });

  test("requireServerUser rejects unauthenticated request", async () => {
    await expect(requireServerUser({ supabase: authClient(null) })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  test("requireOwnedProject allows owner", async () => {
    const supabase = ownershipClient({ id: "project-1", owner_id: "user-1" });

    await expect(
      requireOwnedProject({ supabase, projectId: "project-1", userId: "user-1" }),
    ).resolves.toEqual({ id: "project-1", owner_id: "user-1" });
    expect(supabase.filters).toEqual([
      ["id", "project-1"],
      ["owner_id", "user-1"],
    ]);
  });

  test("requireOwnedProject rejects non-owner", async () => {
    await expect(
      requireOwnedProject({
        supabase: ownershipClient(null),
        projectId: "project-1",
        userId: "intruder",
      }),
    ).rejects.toBeInstanceOf(ProjectOwnershipError);
  });

  test("AccountContext exposes owner permissions", async () => {
    const supabase = {
      ...authClient({ id: "user-1" }),
      ...ownershipClient({ id: "project-1", owner_id: "user-1" }),
    };

    await expect(loadAccountContext({ supabase, projectId: "project-1" })).resolves.toMatchObject({
      userId: "user-1",
      projectId: "project-1",
      workspaceId: null,
      role: "owner",
      permissions: {
        canReadProject: true,
        canWriteProject: true,
        canApplyPatch: true,
        canManageIntegrations: true,
      },
    });
  });
});
