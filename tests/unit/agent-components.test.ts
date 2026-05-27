import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ModelAccordion } from "@/components/agent/model-accordion";
import { SlashCommandMenu } from "@/components/agent/slash-command-menu";

describe("agent UI components", () => {
  test("slash command menu discovers supported commands from slash input", () => {
    const onSelect = vi.fn();

    render(React.createElement(SlashCommandMenu, { input: "/sto", onSelect }));

    fireEvent.click(screen.getByRole("button", { name: /\/storyboard/i }));
    expect(onSelect).toHaveBeenCalledWith("/storyboard");
  });

  test("model accordion renders all modality selectors", () => {
    render(
      React.createElement(ModelAccordion, {
        models: {
          chat: "gemini-2.5-flash",
          image: "Qwen/Qwen-Image",
          video: "tencent/HunyuanVideo",
          audio: "hexgrad/Kokoro-82M",
        },
        onChange: () => {},
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /routing/i }));
    expect(screen.getByLabelText("chat model")).toBeInTheDocument();
    expect(screen.getByLabelText("image model")).toBeInTheDocument();
    expect(screen.getByLabelText("video model")).toBeInTheDocument();
    expect(screen.getByLabelText("audio model")).toBeInTheDocument();
  });
});
