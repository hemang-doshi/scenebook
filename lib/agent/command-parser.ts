import { isSupportedAgentCommand } from "@/lib/agent/tools/registry";
import type { ParsedSlashCommand } from "@/lib/agent/types";

export function parseSlashCommand(input: string): ParsedSlashCommand {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { command: null, input: trimmed, isCommand: false };
  }

  const [rawCommand, ...rest] = trimmed.slice(1).split(/\s+/);

  if (!rawCommand || !isSupportedAgentCommand(rawCommand)) {
    return { command: null, input: trimmed, isCommand: false };
  }

  return {
    command: rawCommand,
    input: rest.join(" ").trim(),
    isCommand: true,
  };
}
