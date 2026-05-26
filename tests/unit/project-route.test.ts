import { beforeEach, describe, expect, test, vi } from "vitest";

const createProject = vi.fn();

vi.mock("@/lib/data/repository", () => ({
  createProject,
}));

describe("POST /api/projects", () => {
  beforeEach(() => {
    createProject.mockReset();
  });

  test("creates a project from lightweight form data", async () => {
    createProject.mockResolvedValue({
      id: "project-123",
      title: "Camera test breakdown",
    });

    const { POST } = await import("@/app/api/projects/route");
    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title: "Camera test breakdown",
          format: "short",
          platform: "youtube",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createProject).toHaveBeenCalledWith({
      title: "Camera test breakdown",
      format: "short",
      platform: "youtube",
    });
  });

  test("rejects invalid lightweight form data", async () => {
    const { POST } = await import("@/app/api/projects/route");
    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title: "",
          format: "short",
          platform: "youtube",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createProject).not.toHaveBeenCalled();
  });
});
