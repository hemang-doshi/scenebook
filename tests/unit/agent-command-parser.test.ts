import { describe, expect, test } from "vitest";

import { parseSlashCommand } from "@/lib/agent/command-parser";

describe("parseSlashCommand", () => {
  test("parses a supported slash command and strips it from the prompt", () => {
    expect(parseSlashCommand("/script tighten the cold open")).toEqual({
      command: "script",
      input: "tighten the cold open",
      isCommand: true,
    });
  });

  test("treats unsupported slash commands as plain text", () => {
    expect(parseSlashCommand("/unknown do something")).toEqual({
      command: null,
      input: "/unknown do something",
      isCommand: false,
    });
  });

  test("treats plain prompts as non-command input", () => {
    expect(parseSlashCommand("write a sharper hook")).toEqual({
      command: null,
      input: "write a sharper hook",
      isCommand: false,
    });
  });
});
