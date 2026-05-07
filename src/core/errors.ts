export interface SMXPErrorBody {
  error: string;
  [key: string]: unknown;
}

export class SMXPError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly body: SMXPErrorBody;

  constructor(status: number, body: SMXPErrorBody) {
    super(body.error || `SMXP error (${status})`);
    this.name = "SMXPError";
    this.status = status;
    this.code = body.error;
    this.body = body;
  }
}

export class SMXPAuthError extends SMXPError {
  constructor(body: SMXPErrorBody) {
    super(401, body);
    this.name = "SMXPAuthError";
  }
}

export class SMXPForbiddenError extends SMXPError {
  constructor(body: SMXPErrorBody) {
    super(403, body);
    this.name = "SMXPForbiddenError";
  }
}

export class SMXPNotFoundError extends SMXPError {
  constructor(body: SMXPErrorBody) {
    super(404, body);
    this.name = "SMXPNotFoundError";
  }
}

export class SMXPConflictError extends SMXPError {
  constructor(body: SMXPErrorBody) {
    super(409, body);
    this.name = "SMXPConflictError";
  }
}

export class SMXPValidationError extends SMXPError {
  constructor(body: SMXPErrorBody) {
    super(400, body);
    this.name = "SMXPValidationError";
  }
}

export class SMXPNetworkError extends Error {
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "SMXPNetworkError";
    this.cause = cause;
  }
}

export class SMXPConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SMXPConfigError";
  }
}

export function createSMXPError(
  status: number,
  body: SMXPErrorBody,
): SMXPError {
  switch (status) {
    case 400:
      return new SMXPValidationError(body);
    case 401:
      return new SMXPAuthError(body);
    case 403:
      return new SMXPForbiddenError(body);
    case 404:
      return new SMXPNotFoundError(body);
    case 409:
      return new SMXPConflictError(body);
    default:
      return new SMXPError(status, body);
  }
}
