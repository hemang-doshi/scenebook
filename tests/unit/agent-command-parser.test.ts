import { describe, expect, test } from "vitest";

import { parseSlashCommand } from "@/lib/agent/command-parser";

describe("parseSlashCommand", () => {
  test("parses a supported slash command and strips it from the prompt", () => {
    expect(parseSlashCommand("/script tighten the cold open")).toEqual({
      command: "script",
      intentHint: null,
      input: "tighten the cold open",
      isCommand: true,
      isIntentHint: false,
    });
  });

  test("parses /plan as an intent hint and strips it from the prompt", () => {
    expect(parseSlashCommand("/plan make a Goa shoot pack")).toEqual({
      command: null,
      intentHint: "plan",
      input: "make a Goa shoot pack",
      isCommand: false,
      isIntentHint: true,
    });
  });

  test("treats unsupported slash commands as plain text", () => {
    expect(parseSlashCommand("/unknown do something")).toEqual({
      command: null,
      intentHint: null,
      input: "/unknown do something",
      isCommand: false,
      isIntentHint: false,
    });
  });

  test("treats plain prompts as non-command input", () => {
    expect(parseSlashCommand("write a sharper hook")).toEqual({
      command: null,
      intentHint: null,
      input: "write a sharper hook",
      isCommand: false,
      isIntentHint: false,
    });
  });
});
