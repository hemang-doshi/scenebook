export type ProjectPatchErrorOptions = {
  code: string;
  message: string;
  recoverable?: boolean;
  cause?: unknown;
};

export class ProjectPatchError extends Error {
  code: string;
  recoverable: boolean;
  override cause?: unknown;

  constructor(options: ProjectPatchErrorOptions) {
    super(options.message);
    this.name = "ProjectPatchError";
    this.code = options.code;
    this.recoverable = options.recoverable ?? true;
    this.cause = options.cause;
  }
}

export class ProjectPatchValidationError extends ProjectPatchError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "PROJECT_PATCH_INVALID",
      message,
      recoverable: true,
      cause,
    });
    this.name = "ProjectPatchValidationError";
  }
}

export function errorFromUnknown(caught: unknown, fallbackCode: string) {
  if (caught instanceof ProjectPatchError) {
    return {
      code: caught.code,
      message: caught.message,
      recoverable: caught.recoverable,
    };
  }

  if (caught instanceof Error) {
    return {
      code: fallbackCode,
      message: caught.message,
      recoverable: true,
    };
  }

  return {
    code: fallbackCode,
    message: String(caught),
    recoverable: true,
  };
}
