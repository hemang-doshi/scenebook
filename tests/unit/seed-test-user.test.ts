import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseAdminClient = vi.fn();
const createClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

describe("seedDevTestUser", () => {
  beforeEach(() => {
    vi.resetModules();
    createSupabaseAdminClient.mockReset();
    createClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  test("creates the test user when no existing account matches the email", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "tester@example.com" } },
      error: null,
    });

    createSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers,
          createUser,
          updateUserById: vi.fn(),
        },
      },
    });

    const { seedDevTestUser } = await import("@/lib/dev/seed-test-user");
    const result = await seedDevTestUser({
      email: "tester@example.com",
      password: "Secret123!",
    });

    expect(createUser).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "Secret123!",
      email_confirm: true,
      user_metadata: { seededBy: "dev-route" },
    });
    expect(result).toMatchObject({
      action: "created",
      email: "tester@example.com",
    });
  });

  test("updates the password when the test user already exists", async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [{ id: "user-2", email: "tester@example.com" }],
      },
      error: null,
    });
    const updateUserById = vi.fn().mockResolvedValue({
      data: { user: { id: "user-2", email: "tester@example.com" } },
      error: null,
    });

    createSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers,
          createUser: vi.fn(),
          updateUserById,
        },
      },
    });

    const { seedDevTestUser } = await import("@/lib/dev/seed-test-user");
    const result = await seedDevTestUser({
      email: "tester@example.com",
      password: "Secret123!",
    });

    expect(updateUserById).toHaveBeenCalledWith("user-2", {
      password: "Secret123!",
      email_confirm: true,
      user_metadata: { seededBy: "dev-route" },
    });
    expect(result).toMatchObject({
      action: "updated",
      email: "tester@example.com",
    });
  });

  test("falls back to signUp when no service role key is configured", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: "user-3", email: "tester@example.com" } },
      error: null,
    });

    createClient.mockReturnValue({
      auth: {
        signUp,
      },
    });

    const { seedDevTestUser } = await import("@/lib/dev/seed-test-user");
    const result = await seedDevTestUser({
      email: "tester@example.com",
      password: "Secret123!",
    });

    expect(signUp).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "Secret123!",
      options: {
        data: { seededBy: "dev-route" },
      },
    });
    expect(result).toMatchObject({
      action: "created",
      email: "tester@example.com",
    });
  });
});
