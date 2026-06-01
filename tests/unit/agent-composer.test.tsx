import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { AgentComposer, type Attachment } from "@/components/agent/agent-composer";
import type { AgentModelSelection } from "@/components/agent/model-accordion";

const baseModels = {
  chat: "gemini-2.5-flash",
  image: "Qwen/Qwen-Image",
  video: "tencent/HunyuanVideo",
  audio: "hexgrad/Kokoro-82M",
};

function renderControlledComposer({
  initialValue = "",
  initialModels = baseModels,
  initialAttachments = [],
  isSending = false,
  onSubmit = vi.fn(),
  onChangeSpy,
  onModelsChangeSpy,
  onAttachmentsChangeSpy,
}: {
  initialValue?: string;
  initialModels?: AgentModelSelection;
  initialAttachments?: Attachment[];
  isSending?: boolean;
  onSubmit?: () => void;
  onChangeSpy?: (value: string) => void;
  onModelsChangeSpy?: (models: AgentModelSelection) => void;
  onAttachmentsChangeSpy?: (attachments: Attachment[]) => void;
} = {}) {
  function Harness() {
    const [value, setValue] = useState(initialValue);
    const [models, setModels] = useState<AgentModelSelection>(initialModels);
    const [attachments, setAttachments] = useState(initialAttachments);

    return (
      <AgentComposer
        value={value}
        onChange={(next) => {
          setValue(next);
          onChangeSpy?.(next);
        }}
        onSubmit={onSubmit}
        isSending={isSending}
        models={models}
        onModelsChange={(next) => {
          setModels(next);
          onModelsChangeSpy?.(next);
        }}
        onQuickCommand={(command) => {
          const next = `${command} `;
          setValue(next);
          onChangeSpy?.(next);
        }}
        attachments={attachments}
        onAttachmentsChange={(next) => {
          setAttachments(next);
          onAttachmentsChangeSpy?.(next);
        }}
      />
    );
  }

  render(<Harness />);
}

describe("AgentComposer", () => {
  test("action menu selects a slash command without submitting", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    renderControlledComposer({ onChangeSpy: onChange, onSubmit });

    fireEvent.click(screen.getByRole("button", { name: /open action menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /\/script/i }));

    expect(screen.getByLabelText("Agent prompt")).toHaveValue("");
    expect(onChange).toHaveBeenCalledWith("/script ");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("active command chip appears and can be removed", () => {
    const onChange = vi.fn();

    renderControlledComposer({ initialValue: "/script draft a launch hook", onChangeSpy: onChange });

    expect(screen.getByText("/script")).toBeInTheDocument();
    expect(screen.getByLabelText("Agent prompt")).toHaveValue("draft a launch hook");

    fireEvent.click(screen.getByRole("button", { name: /remove command/i }));

    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.queryByText("/script")).not.toBeInTheDocument();
  });

  test("attachment chips render and can be removed", () => {
    const onAttachmentsChange = vi.fn();

    renderControlledComposer({
      initialAttachments: [
        { name: "brand-kit.png", type: "image/png", size: 128, url: "blob:brand-kit" },
        { name: "voiceover.mp3", type: "audio/mpeg", size: 256, url: "https://example.com/voiceover.mp3" },
      ],
      onAttachmentsChangeSpy: onAttachmentsChange,
    });

    expect(screen.getByText("brand-kit.png")).toBeInTheDocument();
    expect(screen.getByText("voiceover.mp3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove attachment brand-kit\.png/i }));

    expect(onAttachmentsChange).toHaveBeenCalledWith([
      { name: "voiceover.mp3", type: "audio/mpeg", size: 256, url: "https://example.com/voiceover.mp3" },
    ]);
    expect(screen.queryByText("brand-kit.png")).not.toBeInTheDocument();
  });

  test("routing control changes a model", () => {
    const onModelsChange = vi.fn();

    renderControlledComposer({ onModelsChangeSpy: onModelsChange });

    fireEvent.click(screen.getByRole("button", { name: /model routing/i }));
    fireEvent.click(screen.getByRole("button", { name: /video/i }));
    fireEvent.change(screen.getByLabelText("video model"), {
      target: { value: "Wan-AI/Wan2.2-TI2V-5B" },
    });

    expect(onModelsChange).toHaveBeenCalledWith({
      ...baseModels,
      video: "Wan-AI/Wan2.2-TI2V-5B",
    });
  });

  test("send disables while empty or sending and submits when text exists", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <AgentComposer
        value=""
        onChange={() => {}}
        onSubmit={onSubmit}
        isSending={false}
        models={baseModels}
        onModelsChange={() => {}}
        onQuickCommand={() => {}}
        attachments={[]}
        onAttachmentsChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();

    rerender(
      <AgentComposer
        value="Draft the caption"
        onChange={() => {}}
        onSubmit={onSubmit}
        isSending={false}
        models={baseModels}
        onModelsChange={() => {}}
        onQuickCommand={() => {}}
        attachments={[]}
        onAttachmentsChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <AgentComposer
        value="Draft the caption"
        onChange={() => {}}
        onSubmit={onSubmit}
        isSending
        models={baseModels}
        onModelsChange={() => {}}
        onQuickCommand={() => {}}
        attachments={[]}
        onAttachmentsChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  test("Cmd or Ctrl Enter submits the current draft", () => {
    const onSubmit = vi.fn();

    renderControlledComposer({ initialValue: "Draft a tighter hook", onSubmit });

    fireEvent.keyDown(screen.getByLabelText("Agent prompt"), {
      key: "Enter",
      metaKey: true,
    });
    fireEvent.keyDown(screen.getByLabelText("Agent prompt"), {
      key: "Enter",
      ctrlKey: true,
    });

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
