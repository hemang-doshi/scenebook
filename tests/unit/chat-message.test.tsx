import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ChatMessage } from "@/components/agent/chat-message";
import type { AgentUiMessage } from "@/components/agent/agent-chat-island";

function message(role: AgentUiMessage["role"], content: string): AgentUiMessage {
  return {
    id: `${role}-message`,
    kind: "message",
    role,
    content,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("ChatMessage markdown rendering", () => {
  test("renders assistant markdown blockquotes and dividers as structured content", () => {
    render(
      <ChatMessage
        index={0}
        message={message(
          "assistant",
          [
            "## Positioning",
            "> **SceneBook** is the creator OS for short-form video.",
            "---",
            "- Update the hook",
            "- Save the CTA",
          ].join("\n"),
        )}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Positioning" })).toBeInTheDocument();
    expect(screen.getAllByText("SceneBook")[1]?.closest("blockquote")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("Update the hook");
  });

  test("renders user markdown instead of showing raw formatting markers", () => {
    render(
      <ChatMessage
        index={0}
        message={message(
          "user",
          ["### Product thesis", "SceneBook is **not** a generic AI generator.", "- Save hook and CTA"].join("\n"),
        )}
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Product thesis" })).toBeInTheDocument();
    expect(screen.getByText("not").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*not\*\*/)).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("Save hook and CTA");
  });

  test("uses current text color inside user light cards instead of dark-shell variables", () => {
    render(
      <ChatMessage
        index={0}
        message={message("user", ["## Light card", "- readable item", "`code`"].join("\n"))}
      />,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Light card" });
    expect(heading).toHaveClass("text-current");
    expect(screen.getByText("readable item")).toHaveClass("text-current");
  });

  test("renders partial streaming markdown as it arrives", () => {
    render(
      <ChatMessage
        index={0}
        message={message("assistant", "## Live heading\n- first streamed item")}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Live heading" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("first streamed item");
  });
});
