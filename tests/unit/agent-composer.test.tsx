import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AgentComposer } from "@/components/agent/agent-composer";

const baseModels = {
  chat: "gemini-2.5-flash",
  image: "Qwen/Qwen-Image",
  video: "tencent/HunyuanVideo",
  audio: "hexgrad/Kokoro-82M",
};

describe("AgentComposer", () => {
  test("quick action buttons prefill common slash commands without submitting", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <AgentComposer
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
        isSending={false}
        models={baseModels}
        onModelsChange={() => {}}
        onQuickCommand={(command) => onChange(`${command} `)}
        attachments={[]}
        onAttachmentsChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /script/i }));

    expect(onChange).toHaveBeenCalledWith("/script ");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
