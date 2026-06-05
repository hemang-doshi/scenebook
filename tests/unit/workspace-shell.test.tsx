import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { WorkspaceShell } from "@/components/workspace-shell";

const navigationMock = vi.hoisted(() => ({
  pathname: "/home",
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({
  email: "owner@scenebook.test",
  signOut: vi.fn(),
}));

const { fetchJson } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    replace: navigationMock.replace,
    refresh: navigationMock.refresh,
  }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { email: supabaseMock.email } } }),
      signOut: supabaseMock.signOut,
    },
  }),
}));

vi.mock("@/lib/fetcher", () => ({
  fetchJson,
}));

describe("WorkspaceShell", () => {
  beforeEach(() => {
    navigationMock.pathname = "/home";
    navigationMock.replace.mockReset();
    navigationMock.refresh.mockReset();
    supabaseMock.email = "owner@scenebook.test";
    supabaseMock.signOut.mockReset();
    supabaseMock.signOut.mockResolvedValue(undefined);
    fetchJson.mockReset();
    fetchJson.mockResolvedValue({
      id: "project-1",
      title: "Goa Reel",
      status: "idea",
    });
  });

  test("renders centered primary nav without breadcrumbs", () => {
    navigationMock.pathname = "/projects/project-1";

    render(
      <WorkspaceShell>
        <div>Workspace</div>
      </WorkspaceShell>,
    );

    expect(screen.queryByRole("navigation", { name: /breadcrumb/i })).not.toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: /primary workspace/i });
    expect(nav).toHaveAttribute("data-alignment", "center");
    expect(screen.getByRole("link", { name: /projects/i })).toBeInTheDocument();
  });

  test("does not render the redundant desktop action rail", () => {
    const { container } = render(
      <WorkspaceShell>
        <div>Workspace</div>
      </WorkspaceShell>,
    );

    const shell = container.firstElementChild as HTMLElement;
    expect(shell.style.getPropertyValue("--workspace-rail-width")).toBe("");

    expect(screen.queryByRole("complementary", { name: /workspace actions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(screen.queryByText("owner@scenebook.test")).not.toBeInTheDocument();
  });

  test("renders active project context without duplicate nav pills", async () => {
    navigationMock.pathname = "/projects/project-1/chat";

    render(
      <WorkspaceShell>
        <div>Workspace</div>
      </WorkspaceShell>,
    );

    const projectContext = await screen.findByLabelText("Active project context");
    expect(fetchJson).toHaveBeenCalledWith("/api/projects/project-1/summary");
    expect(within(projectContext).getByText("Goa Reel")).toBeInTheDocument();
    expect(within(projectContext).getByText("/")).toHaveClass("font-mono");
    expect(within(projectContext).queryByText("Project")).not.toBeInTheDocument();
    expect(within(projectContext).queryByText("Idea")).not.toBeInTheDocument();
  });

  test("renders a mobile menu trigger and drawer navigation", () => {
    render(
      <WorkspaceShell>
        <div>Workspace</div>
      </WorkspaceShell>,
    );

    const trigger = screen.getByRole("button", { name: /toggle navigation/i });
    expect(trigger).toHaveClass("md:hidden");

    fireEvent.click(trigger);

    expect(screen.getByRole("link", { name: "New project" })).toHaveAttribute("href", "/home?create=1");
  });

  test("signs out from the drawer", async () => {
    render(
      <WorkspaceShell>
        <div>Workspace</div>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /toggle navigation/i }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(supabaseMock.signOut).toHaveBeenCalledTimes(1);
      expect(navigationMock.replace).toHaveBeenCalledWith("/sign-in");
      expect(navigationMock.refresh).toHaveBeenCalledTimes(1);
    });
  });

  test("theme toggle switches document theme and persists it", () => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";

    render(
      <WorkspaceShell>
        <div>Workspace</div>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("scenebook-theme")).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: /switch to dark mode/i }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("scenebook-theme")).toBe("dark");
  });
});
