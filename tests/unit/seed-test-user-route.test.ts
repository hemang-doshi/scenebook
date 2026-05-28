import { beforeEach, describe, expect, test, vi } from "vitest";

const seedDevTestUser = vi.fn();

vi.mock("@/lib/dev/seed-test-user", () => ({
  seedDevTestUser,
}));

describe("POST /api/dev/seed-test-user", () => {
  beforeEach(() => {
    vi.resetModules();
    seedDevTestUser.mockReset();
  });

  test("seeds a dev test user when given valid credentials", async () => {
    seedDevTestUser.mockResolvedValue({
      action: "created",
      email: "tester@example.com",
    });

    const { POST } = await import("@/app/api/dev/seed-test-user/route");
    const response = await POST(
      new Request("http://localhost/api/dev/seed-test-user", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "Secret123!",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(seedDevTestUser).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "Secret123!",
    });
  });

  test("rejects invalid payloads", async () => {
    const { POST } = await import("@/app/api/dev/seed-test-user/route");
    const response = await POST(
      new Request("http://localhost/api/dev/seed-test-user", {
        method: "POST",
        body: JSON.stringify({
          email: "tester@example.com",
          password: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(seedDevTestUser).not.toHaveBeenCalled();
  });
});
