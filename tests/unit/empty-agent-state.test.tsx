import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { EmptyAgentState } from "@/components/agent/empty-agent-state";

describe("EmptyAgentState", () => {
  test("renders a direct-prompt empty state without slash-command launchpad buttons", () => {
    const onQuickCommand = vi.fn();

    render(<EmptyAgentState onQuickCommand={onQuickCommand} />);

    expect(screen.getByText("What should we build in SceneBook?")).toBeInTheDocument();
    expect(screen.getByText(/start with a direct prompt/i)).toBeInTheDocument();

    for (const command of [
      "/script",
      "/plan",
      "/readiness-check",
      "/generate-image",
      "/form-json-prompt",
      "/package",
    ]) {
      expect(screen.queryByRole("button", { name: new RegExp(command.replace("/", "\\/")) })).not.toBeInTheDocument();
    }
    expect(onQuickCommand).not.toHaveBeenCalled();
  });
});
