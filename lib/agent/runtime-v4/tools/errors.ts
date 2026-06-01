import type { JsonValue } from "@/lib/types";
import type { ToolExecutionError } from "@/lib/agent/runtime-v4/tools/types";

export const TOOL_ERROR_CODES = {
  INPUT_INVALID: "TOOL_INPUT_INVALID",
  OUTPUT_INVALID: "TOOL_OUTPUT_INVALID",
  NOT_FOUND: "TOOL_NOT_FOUND",
  UNAVAILABLE: "TOOL_UNAVAILABLE",
  POLICY_BLOCKED: "TOOL_POLICY_BLOCKED",
  POLICY_FAILED: "TOOL_POLICY_FAILED",
  VERIFICATION_FAILED: "TOOL_VERIFICATION_FAILED",
  HANDLER_FAILED: "TOOL_HANDLER_FAILED",
} as const;

export class ToolRuntimeError extends Error {
  code: string;
  recoverable: boolean;
  details?: JsonValue;

  constructor(error: ToolExecutionError) {
    super(error.message);
    this.name = "ToolRuntimeError";
    this.code = error.code;
    this.recoverable = error.recoverable;
    this.details = error.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonSafe(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return String(value);
  }
}

export function createToolError(input: ToolExecutionError): ToolExecutionError {
  return input;
}

export function createZodToolError(input: {
  code: string;
  message: string;
  error: { issues?: unknown };
  recoverable?: boolean;
}): ToolExecutionError {
  return {
    code: input.code,
    message: input.message,
    recoverable: input.recoverable ?? true,
    details: jsonSafe({ issues: input.error.issues ?? [] }),
  };
}

export function normalizeToolError(
  caught: unknown,
  fallback: ToolExecutionError,
): ToolExecutionError {
  if (caught instanceof ToolRuntimeError) {
    return {
      code: caught.code,
      message: caught.message,
      recoverable: caught.recoverable,
      details: caught.details,
    };
  }

  if (isRecord(caught)) {
    return {
      code: typeof caught.code === "string" ? caught.code : fallback.code,
      message: typeof caught.message === "string"
        ? caught.message
        : fallback.message,
      recoverable: typeof caught.recoverable === "boolean"
        ? caught.recoverable
        : fallback.recoverable,
      details: caught.details === undefined
        ? fallback.details
        : jsonSafe(caught.details),
    };
  }

  if (caught instanceof Error) {
    const maybeError = caught as Error & {
      code?: unknown;
      recoverable?: unknown;
      details?: unknown;
    };

    return {
      code: typeof maybeError.code === "string" ? maybeError.code : fallback.code,
      message: caught.message || fallback.message,
      recoverable: typeof maybeError.recoverable === "boolean"
        ? maybeError.recoverable
        : fallback.recoverable,
      details: maybeError.details === undefined
        ? fallback.details
        : jsonSafe(maybeError.details),
    };
  }

  return fallback;
}
