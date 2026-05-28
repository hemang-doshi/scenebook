import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { AssetDrawer } from "@/components/agent/asset-drawer";

const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

describe("AssetDrawer", () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  test("renders as a dropdown panel anchored below the trigger", async () => {
    fetchJson.mockResolvedValue({
      folders: [],
      looseAssets: [],
    });

    render(
      React.createElement(AssetDrawer, {
        projectId: "project-1",
        open: true,
        onOpenChange: () => {},
      }),
    );

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith("/api/projects/project-1/assets");
    });

    const panel = screen.getByTestId("asset-library-panel");
    expect(panel.className).toContain("left-0");
    expect(panel.className).toContain("top-full");
    expect(panel.className).not.toContain("right-0");
    expect(panel.className).not.toContain("inset-y-0");
  });

  test("renders a view link for visible assets", async () => {
    fetchJson.mockResolvedValue({
      folders: [],
      looseAssets: [
        {
          id: "asset-1",
          type: "image",
          title: "Hero still",
          url: "https://example.com/hero.png",
        },
      ],
    });

    render(
      React.createElement(AssetDrawer, {
        projectId: "project-1",
        open: true,
        onOpenChange: () => {},
      }),
    );

    const link = await screen.findByRole("link", { name: /open hero still/i });
    expect(link).toHaveAttribute("href", "https://example.com/hero.png");
    expect(screen.getByAltText("Hero still")).toBeInTheDocument();
  });
});
