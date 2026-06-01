import type { ModelProfileName, ModelProviderId } from "@/lib/ai/model-gateway/types";

type ModelErrorDetails = {
  provider?: ModelProviderId | string;
  profile?: ModelProfileName | string;
  schemaName?: string;
  message: string;
  rawText?: string;
  cause?: unknown;
  recoverable?: boolean;
};

function detailsFrom(input: ModelErrorDetails | string): ModelErrorDetails {
  return typeof input === "string" ? { message: input } : input;
}

class ModelGatewayBaseError extends Error {
  provider?: ModelProviderId | string;
  profile?: ModelProfileName | string;
  schemaName?: string;
  rawText?: string;
  recoverable: boolean;
  cause?: unknown;

  constructor(input: ModelErrorDetails | string) {
    const details = detailsFrom(input);
    super(details.message);
    this.provider = details.provider;
    this.profile = details.profile;
    this.schemaName = details.schemaName;
    this.rawText = details.rawText;
    this.recoverable = details.recoverable ?? true;
    this.cause = details.cause;
  }
}

export class ModelConfigurationError extends ModelGatewayBaseError {
  code = "MODEL_CONFIGURATION_ERROR" as const;

  constructor(input: ModelErrorDetails | string) {
    super(input);
    this.name = "ModelConfigurationError";
  }
}

export class ModelInvocationError extends ModelGatewayBaseError {
  code = "MODEL_INVOCATION_ERROR" as const;

  constructor(input: ModelErrorDetails | string) {
    super(input);
    this.name = "ModelInvocationError";
  }
}

export class ModelStructuredOutputError extends ModelGatewayBaseError {
  code = "MODEL_STRUCTURED_OUTPUT_ERROR" as const;

  constructor(input: ModelErrorDetails | string) {
    super(input);
    this.name = "ModelStructuredOutputError";
  }
}

export { ModelConfigurationError as ModelGatewayConfigurationError };
export { ModelInvocationError as ModelGatewayResponseError };
