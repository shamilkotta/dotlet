import * as Data from "effect/Data";

export class CliConfigError extends Data.TaggedError("CliConfigError")<{
  message: string;
  cause?: unknown;
}> {}

export class CliPathError extends Data.TaggedError("CliPathError")<{
  message: string;
  cause?: unknown;
}> {}

export class CliValidationError extends Data.TaggedError("CliValidationError")<{
  message: string;
  cause?: unknown;
}> {}

export class CliAuthError extends Data.TaggedError("CliAuthError")<{
  message: string;
}> {}

export class CliApiError extends Data.TaggedError("CliApiError")<{
  message: string;
  status?: number;
  body?: string;
  cause?: unknown;
}> {}

export class CliUploadError extends Data.TaggedError("CliUploadError")<{
  message: string;
  status?: number;
  body?: string;
  cause?: unknown;
}> {}

export class CliDownloadError extends Data.TaggedError("CliDownloadError")<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

export class CliBrowserError extends Data.TaggedError("CliBrowserError")<{
  message: string;
  cause?: unknown;
}> {}
