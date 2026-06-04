import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { HomePageClient } from "@/components/workspace/home-page-client";
import type { ProjectSummary } from "@/lib/data/repository";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

const projects: ProjectSummary[] = [
  {
    id: "project-idea",
    title: "Goa creator workflow",
    status: "idea",
    format: "reel",
    platform: "instagram",
    assetCount: 0,
    updatedAt: "2026-06-02T09:00:00.000Z",
  },
  {
    id: "project-ready",
    title: "Desk lighting reset",
    status: "ready_to_shoot",
    format: "short",
    platform: "youtube",
    assetCount: 3,
    updatedAt: "2026-06-03T09:00:00.000Z",
  },
  {
    id: "project-edit",
    title: "Camera menu cleanup",
    status: "editing",
    format: "tiktok",
    platform: "tiktok",
    assetCount: 5,
    updatedAt: "2026-06-04T09:00:00.000Z",
  },
];

describe("HomePageClient", () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    fetchJson.mockReset();
  });

  test("renders home as the Production Command Center", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    expect(screen.getByText("Production Command Center")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your reels in motion/i })).toBeInTheDocument();
    expect(screen.getByText(/plan, package, edit, and learn from every short-form project/i)).toBeInTheDocument();
    expect(screen.queryByText(/notion-style database/i)).not.toBeInTheDocument();
  });

  test("surfaces active productions with next action and an Agent-first path", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    const activeProductions = screen.getByRole("region", { name: /active productions/i });
    const projectCard = within(activeProductions).getByText("Goa creator workflow").closest("article");
    expect(projectCard).not.toBeNull();

    const card = within(projectCard as HTMLElement);
    expect(card.getByText("Next action")).toBeInTheDocument();
    expect(card.getByRole("link", { name: /^agent$/i })).toHaveAttribute(
      "href",
      "/projects/project-idea/chat",
    );
  });

  test("does not render a separate needs attention sidebar", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    expect(screen.queryByRole("complementary", { name: /needs attention/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /needs attention/i })).not.toBeInTheDocument();
  });

  test("switches between expanded gallery and compact table views", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    expect(screen.getByRole("region", { name: /expanded gallery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expanded gallery view/i })).toHaveClass("h-9");
    expect(screen.getByRole("button", { name: /compact table view/i })).toHaveClass("h-9");
    expect(screen.queryByText("Expanded gallery")).not.toBeInTheDocument();
    expect(screen.queryByText("Compact table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /compact table view/i }));

    expect(screen.getByRole("table", { name: /production table/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /expanded gallery/i })).not.toBeInTheDocument();
  });

  test("expanded gallery lays out cards as a multi-column aligned grid", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    const gallery = screen.getByRole("region", { name: /expanded gallery/i });
    expect(gallery).toHaveClass("lg:grid-cols-2");

    const projectCard = within(gallery).getByText("Goa creator workflow").closest("article");
    expect(projectCard).not.toBeNull();

    expect(projectCard).toHaveClass("h-full");
    expect(within(projectCard as HTMLElement).getByTestId("project-card-actions")).toHaveClass("grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]");
    expect(within(projectCard as HTMLElement).getByRole("button", { name: /^agent$/i }).querySelector("svg")).toBeInTheDocument();
    expect(within(projectCard as HTMLElement).getByRole("button", { name: /^hub$/i }).querySelector("svg")).toBeInTheDocument();
  });

  test("lets project status change from the home project surface", async () => {
    fetchJson.mockResolvedValue({});
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    const activeProductions = screen.getByRole("region", { name: /expanded gallery/i });
    const projectCard = within(activeProductions).getByText("Goa creator workflow").closest("article");
    expect(projectCard).not.toBeNull();

    const card = within(projectCard as HTMLElement);
    fireEvent.click(card.getByRole("button", { name: "Idea" }));
    fireEvent.click(screen.getByRole("button", { name: "Scripted" }));

    expect(fetchJson).toHaveBeenCalledWith(
      "/api/projects/project-idea",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "scripted" }),
      }),
    );
    expect(card.getByRole("button", { name: "Scripted" })).toBeInTheDocument();
  });

  test("lets projects be deleted from the home project surface", async () => {
    fetchJson.mockResolvedValue({});
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    const gallery = screen.getByRole("region", { name: /expanded gallery/i });
    const projectCard = within(gallery).getByText("Goa creator workflow").closest("article");
    expect(projectCard).not.toBeNull();

    fireEvent.click(within(projectCard as HTMLElement).getByRole("button", { name: /delete goa creator workflow/i }));

    expect(fetchJson).toHaveBeenCalledWith(
      "/api/projects/project-idea",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      }),
    );
    expect(screen.queryByText("Goa creator workflow")).not.toBeInTheDocument();
  });

  test("uses semantic SceneBook badges for project status, format, and platform", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    const activeProductions = screen.getByRole("region", { name: /expanded gallery/i });
    const projectCard = within(activeProductions).getByText("Desk lighting reset").closest("article");
    expect(projectCard).not.toBeNull();

    const card = within(projectCard as HTMLElement);
    expect(card.getAllByText("Ready to Shoot")[0]).toHaveClass("border-[var(--amber)]");
    expect(card.getByText("SHORT")).toHaveClass("border-[var(--blue)]");
    expect(card.getByText("YOUTUBE")).toHaveClass("border-[var(--line)]");
  });

  test("keeps project creation entry point behavior unchanged", () => {
    render(<HomePageClient initialCreateOpen={false} projects={projects} />);

    fireEvent.click(screen.getByRole("button", { name: /new project/i }));

    expect(routerMock.replace).toHaveBeenCalledWith("/home?create=1");
    expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
  });
});
