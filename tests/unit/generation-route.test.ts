import { beforeEach, describe, expect, test, vi } from "vitest";

const generateProjectMedia = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/generation/generate-media", () => ({
  generateProjectMedia,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

describe("POST /api/projects/[id]/generations", () => {
  beforeEach(() => {
    vi.resetModules();
    generateProjectMedia.mockReset();
    createSupabaseServerClient.mockReset();

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });

    generateProjectMedia.mockResolvedValue({
      generationId: "generation-1",
      assetId: "asset-1",
      url: "https://example.com/generated.png",
      path: "project/generated.png",
    });
  });

  test("uses an explicit folder id when provided", async () => {
    const { POST } = await import("@/app/api/projects/[id]/generations/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt: "macro bronze watch",
          modality: "image",
          folderId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(generateProjectMedia).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      prompt: "macro bronze watch",
      modality: "image",
      folderId: "11111111-1111-4111-8111-111111111111",
    });
  });

  test("falls back to the default modality folder when no folder id is provided", async () => {
    const { POST } = await import("@/app/api/projects/[id]/generations/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt: "macro bronze watch",
          modality: "image",
          title: "Hero still",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(generateProjectMedia).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      prompt: "macro bronze watch",
      modality: "image",
      title: "Hero still",
    });
  });
});
