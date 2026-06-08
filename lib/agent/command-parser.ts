import { isSupportedAgentCommand } from "@/lib/agent/tools/registry";
import type { ParsedSlashCommand } from "@/lib/agent/types";

const supportedIntentHints = new Set(["plan"]);

export function parseSlashCommand(input: string): ParsedSlashCommand {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { command: null, intentHint: null, input: trimmed, isCommand: false, isIntentHint: false };
  }

  const [rawCommand, ...rest] = trimmed.slice(1).split(/\s+/);
  const commandInput = rest.join(" ").trim();

  if (!rawCommand || !isSupportedAgentCommand(rawCommand)) {
    if (rawCommand && supportedIntentHints.has(rawCommand)) {
      return {
        command: null,
        intentHint: rawCommand as "plan",
        input: commandInput,
        isCommand: false,
        isIntentHint: true,
      };
    }

    return { command: null, intentHint: null, input: trimmed, isCommand: false, isIntentHint: false };
  }

  return {
    command: rawCommand,
    intentHint: null,
    input: commandInput,
    isCommand: true,
    isIntentHint: false,
  };
}
