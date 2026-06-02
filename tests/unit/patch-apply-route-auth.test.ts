import { beforeEach, describe, expect, test, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  ownedProject: null as { id: string; owner_id: string } | null,
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supabaseMock.authUser } }),
    },
    from: supabaseMock.from,
  }),
}));

function selectChain(data: unknown) {
  return {
    eq() {
      return this;
    },
    maybeSingle: async () => ({ data, error: null }),
  };
}

describe("planned patch apply route auth", () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseMock.authUser = { id: "user-1" };
    supabaseMock.ownedProject = null;
    supabaseMock.from.mockImplementation((table: string) => ({
      select: () => selectChain(table === "content_cards" ? supabaseMock.ownedProject : null),
      update: () => selectChain(null),
    }));
  });

  test("patch apply route behavior remains owner-only", async () => {
    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");

    const response = await POST(new Request("http://localhost/apply", { method: "POST" }), {
      params: Promise.resolve({ id: "project-1", patchId: "patch-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Project not found." });
    expect(supabaseMock.from).toHaveBeenCalledWith("content_cards");
    expect(supabaseMock.from).not.toHaveBeenCalledWith("agent_project_patches");
  });
});
