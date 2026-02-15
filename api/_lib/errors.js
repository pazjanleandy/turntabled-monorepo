export class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ExternalApiError extends AppError {
  constructor(message, statusCode = 502, details = null) {
    super(message, statusCode, "EXTERNAL_API_ERROR", details);
  }
}

export class InfrastructureError extends AppError {
  constructor(message, details = null) {
    super(message, 500, "INFRASTRUCTURE_ERROR", details);
  }
}

export function toErrorResponse(error, requestId) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        requestId,
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
      },
      requestId,
    },
  };
}
