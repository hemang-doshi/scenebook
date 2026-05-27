import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.fn();
const decryptSecret = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/secure-settings", () => ({
  decryptSecret,
}));

type FetchBody = {
  data?: Array<{
    id?: string;
    name?: string;
    media_type?: string;
    media_product_type?: string;
    values?: Array<{ value: number }>;
  }>;
  error?: { message: string };
  id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
};

function jsonResponse(body: FetchBody, status = 200) {
  return {
    status,
    json: async () => body,
  };
}

function createSupabaseMock() {
  const account = {
    id: "social-account-1",
    user_id: "user-1",
    account_id: "ig-user-1",
    account_name: "Creator",
    account_username: "creator",
    access_token_encrypted: "encrypted-token",
    profile_picture_url: null,
    metadata: {},
  };

  let cachedPayload: unknown;

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    from: vi.fn(() => {
      let mode: "select" | "update" = "select";

      const builder = {
        select: vi.fn(() => builder),
        update: vi.fn((payload: unknown) => {
          mode = "update";
          cachedPayload = payload;
          return builder;
        }),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
          const result =
            mode === "update"
              ? { error: null }
              : { data: [account], error: null };

          return Promise.resolve(result).then(resolve, reject);
        },
      };

      return builder;
    }),
  };

  createSupabaseServerClient.mockResolvedValue(supabase);

  return {
    getCachedPayload: () => cachedPayload as {
      metadata: {
        posts: Array<{
          metrics: {
            views: number | null;
            reach: number | null;
            saves: number | null;
            shares: number | null;
            impressions: number | null;
          };
          error: string | null;
        }>;
        kpis: {
          views: number | null;
          reach: number | null;
          impressions: number | null;
        };
      };
    },
  };
}

function mockInstagramFetch(insightsBody: FetchBody, insightsStatus = 200) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("graph.instagram.com/me?")) {
      return jsonResponse({
        id: "ig-user-1",
        username: "creator",
        name: "Creator",
        profile_picture_url: "https://example.com/avatar.jpg",
        followers_count: 500,
      });
    }

    if (url.includes("graph.instagram.com/me/media?")) {
      return jsonResponse({
        data: [
          {
            id: "media-1",
            name: "Media 1",
            media_type: "VIDEO",
            media_product_type: "REELS",
          },
        ],
      });
    }

    if (url.includes("graph.instagram.com/media-1/insights?")) {
      return jsonResponse(insightsBody, insightsStatus);
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("POST /api/analytics/sync", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    createSupabaseServerClient.mockReset();
    decryptSecret.mockReset();
    decryptSecret.mockReturnValue("instagram-token");
  });

  test("requests the current views metric for media insights", async () => {
    createSupabaseMock();
    const fetchMock = mockInstagramFetch({
      data: [
        { name: "views", values: [{ value: 1200 }] },
        { name: "reach", values: [{ value: 900 }] },
        { name: "saved", values: [{ value: 45 }] },
        { name: "shares", values: [{ value: 30 }] },
      ],
    });

    const { POST } = await import("@/app/api/analytics/sync/route");
    await POST(
      new Request("http://localhost/api/analytics/sync", {
        method: "POST",
        body: JSON.stringify({ accountId: "social-account-1" }),
      }),
    );

    const insightsUrl = fetchMock.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes("/media-1/insights?"));

    expect(insightsUrl).toBeDefined();
    expect(new URL(insightsUrl as string).searchParams.get("metric")).toBe(
      "views,reach,saved,shares",
    );
  });

  test("caches real views, reach, saves, and shares from the insights response", async () => {
    const supabaseMock = createSupabaseMock();
    mockInstagramFetch({
      data: [
        { name: "views", values: [{ value: 1200 }] },
        { name: "reach", values: [{ value: 900 }] },
        { name: "saved", values: [{ value: 45 }] },
        { name: "shares", values: [{ value: 30 }] },
      ],
    });

    const { POST } = await import("@/app/api/analytics/sync/route");
    const response = await POST(
      new Request("http://localhost/api/analytics/sync", {
        method: "POST",
        body: JSON.stringify({ accountId: "social-account-1" }),
      }),
    );

    expect(response.status).toBe(200);

    const cachedPayload = supabaseMock.getCachedPayload();
    const metrics = cachedPayload.metadata.posts[0]?.metrics;

    expect(metrics).toMatchObject({
      views: 1200,
      reach: 900,
      saves: 45,
      shares: 30,
      impressions: null,
    });
    expect(cachedPayload.metadata.kpis).toMatchObject({
      views: 1200,
      reach: 900,
      impressions: null,
    });
  });

  test("keeps unsupported metric errors generic instead of pre-conversion", async () => {
    const supabaseMock = createSupabaseMock();
    const errorMessage =
      "The Media Insights API does not support the plays metric for this media product type.";
    mockInstagramFetch({ error: { message: errorMessage } }, 400);

    const { POST } = await import("@/app/api/analytics/sync/route");
    const response = await POST(
      new Request("http://localhost/api/analytics/sync", {
        method: "POST",
        body: JSON.stringify({ accountId: "social-account-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.getCachedPayload().metadata.posts[0]?.error).toBe(errorMessage);
  });
});
