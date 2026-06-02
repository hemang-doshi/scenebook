import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

function query(data: unknown[]) {
  const builder = {
    select: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    order: vi.fn(async () => ({ data, error: null })),
  };

  return builder;
}

describe("listProjectSummaries", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  test("excludes archived projects from dashboard summaries", async () => {
    const cards = query([
      {
        id: "active-1",
        title: "Active Reel",
        status: "idea",
        format: "reel",
        platform: "instagram",
        updated_at: "2026-06-02T00:00:00.000Z",
      },
    ]);
    const assets = query([]);

    createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "content_cards") return cards;
        if (table === "card_assets") return assets;
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { listProjectSummaries } = await import("@/lib/data/repository");
    const projects = await listProjectSummaries();

    expect(cards.neq).toHaveBeenCalledWith("status", "archived");
    expect(projects.map((project) => project.id)).toEqual(["active-1"]);
  });
});
