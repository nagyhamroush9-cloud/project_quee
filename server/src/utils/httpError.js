export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export function badRequest(message, details) {
  return new HttpError(400, message, details, "BAD_REQUEST");
}
export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message, undefined, "UNAUTHORIZED");
}
export function forbidden(message = "Forbidden") {
  return new HttpError(403, message, undefined, "FORBIDDEN");
}
export function notFound(message = "Not Found") {
  return new HttpError(404, message, undefined, "NOT_FOUND");
}

