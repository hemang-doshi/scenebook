import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

function createSupabaseMock() {
  const folders = [
    {
      id: "folder-images",
      owner_id: "user-1",
      project_id: "project-1",
      name: "Images",
      parent_id: null,
      sort_order: 0,
      metadata: {},
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    },
    {
      id: "folder-child",
      owner_id: "user-1",
      project_id: "project-1",
      name: "Close Ups",
      parent_id: "folder-images",
      sort_order: 1,
      metadata: {},
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    },
  ];

  const folderItems = [
    {
      id: "item-1",
      owner_id: "user-1",
      folder_id: "folder-images",
      asset_id: "asset-1",
      sort_order: 0,
      created_at: "2026-05-27T00:00:00.000Z",
    },
  ];

  const assets = [
    {
      id: "asset-1",
      owner_id: "user-1",
      card_id: "project-1",
      type: "image",
      title: "Hero still",
      url: "https://example.com/hero.png",
      note: "prompt",
      storage_path: "path/hero.png",
      source: "generated",
      scene_key: null,
      metadata: {},
      generation_id: "generation-1",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    },
    {
      id: "asset-2",
      owner_id: "user-1",
      card_id: "project-1",
      type: "video",
      title: "B-roll hallway",
      url: "https://example.com/broll.mp4",
      note: "prompt",
      storage_path: "path/broll.mp4",
      source: "generated",
      scene_key: null,
      metadata: {},
      generation_id: "generation-2",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    },
  ];

  function createBuilder(table: string) {
    const state = {
      filters: [] as Array<{ column: string; value: unknown }>,
      inserted: null as unknown,
    };

    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn((payload: unknown) => {
        state.inserted = payload;
        return builder;
      }),
      delete: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        state.filters.push({ column, value });
        return builder;
      }),
      order: vi.fn(() => builder),
      single: vi.fn(async () => {
        if (table === "asset_folders") {
          const idFilter = state.filters.find((filter) => filter.column === "id");
          if (idFilter) {
            return {
              data: folders.find((folder) => folder.id === idFilter.value) ?? null,
              error: null,
            };
          }

          if (state.inserted) {
            return {
              data: { id: "new-folder", ...(state.inserted as object) },
              error: null,
            };
          }
        }

        if (table === "asset_versions") {
          return {
            data: { id: "version-1", ...(state.inserted as object) },
            error: null,
          };
        }

        return { data: null, error: null };
      }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        let result: unknown = { data: [], error: null };

        if (table === "asset_folders") {
          result = { data: folders, error: null };
        } else if (table === "asset_folder_items") {
          result = { data: folderItems, error: null };
        } else if (table === "card_assets") {
          result = { data: assets, error: null };
        } else if (table === "asset_versions") {
          result = { data: [], error: null };
        }

        return Promise.resolve(result).then(resolve, reject);
      },
    };

    return builder;
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn((table: string) => createBuilder(table)),
  };

  createSupabaseServerClient.mockResolvedValue(supabase);

  return {
    supabase,
  };
}

function createSupabaseMockWithMissingFolderTables() {
  const assets = [
    {
      id: "asset-1",
      owner_id: "user-1",
      card_id: "project-1",
      type: "image",
      title: "Hero still",
      url: "https://example.com/hero.png",
      note: "prompt",
      storage_path: "path/hero.png",
      source: "generated",
      scene_key: null,
      metadata: {},
      generation_id: "generation-1",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    },
    {
      id: "asset-2",
      owner_id: "user-1",
      card_id: "project-1",
      type: "video",
      title: "B-roll hallway",
      url: "https://example.com/broll.mp4",
      note: "prompt",
      storage_path: "path/broll.mp4",
      source: "generated",
      scene_key: null,
      metadata: {},
      generation_id: "generation-2",
      created_at: "2026-05-27T00:00:00.000Z",
      updated_at: "2026-05-27T00:00:00.000Z",
    },
  ];

  function createBuilder(table: string) {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        if (table === "card_assets") {
          return Promise.resolve({ data: assets, error: null }).then(resolve, reject);
        }

        return Promise.resolve({
          data: null,
          error: new Error('relation "public.asset_folders" does not exist'),
        }).then(resolve, reject);
      },
    };

    return builder;
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn((table: string) => createBuilder(table)),
  };

  createSupabaseServerClient.mockResolvedValue(supabase);
}

describe("asset folders service", () => {
  beforeEach(() => {
    vi.resetModules();
    createSupabaseServerClient.mockReset();
  });

  test("returns folders with child folders and loose assets", async () => {
    createSupabaseMock();
    const { getProjectAssetLibrary } = await import("@/lib/assets/asset-folders");

    const library = await getProjectAssetLibrary("project-1");

    expect(library.folders).toHaveLength(2);
    expect(library.folders[0]).toMatchObject({
      id: "folder-images",
      assets: [{ id: "asset-1" }],
      childFolders: [{ id: "folder-child" }],
    });
    expect(library.looseAssets).toMatchObject([{ id: "asset-2" }]);
  });

  test("falls back to loose assets when folder tables are unavailable", async () => {
    createSupabaseMockWithMissingFolderTables();
    const { getProjectAssetLibrary } = await import("@/lib/assets/asset-folders");

    const library = await getProjectAssetLibrary("project-1");

    expect(library.folders).toEqual([]);
    expect(library.looseAssets).toMatchObject([{ id: "asset-1" }, { id: "asset-2" }]);
  });

  test("maps default generated video folders to B-roll when the title says so", async () => {
    const { getDefaultAssetFolderName } = await import("@/lib/assets/asset-folders");

    expect(
      getDefaultAssetFolderName({
        type: "video",
        title: "Night street B-roll clip",
        modality: "video",
      }),
    ).toBe("B-roll");
  });

  test("creates or reuses asset folder paths without duplicate names", async () => {
    createSupabaseMock();
    const { getOrCreateAssetFolderPath } = await import("@/lib/assets/asset-folders");

    const reused = await getOrCreateAssetFolderPath("project-1", "Images");
    expect(reused).toMatchObject({
      folder: { id: "folder-images", name: "Images" },
      path: "Images",
      alreadyExisted: true,
    });

    const created = await getOrCreateAssetFolderPath("project-1", "Generated / Images");
    expect(created).toMatchObject({
      folder: { id: "new-folder", name: "Images" },
      path: "Generated / Images",
      alreadyExisted: false,
    });
  });

  test("creates asset versions under the active project", async () => {
    createSupabaseMock();
    const { createAssetVersion } = await import("@/lib/assets/asset-folders");

    const version = await createAssetVersion("project-1", "asset-1", {
      generationId: "generation-1",
      url: "https://example.com/version.png",
      model: "flux",
      provider: "huggingface",
      prompt: "hero still",
    });

    expect(version).toMatchObject({
      id: "version-1",
      project_id: "project-1",
      asset_id: "asset-1",
      model: "flux",
    });
  });
});
