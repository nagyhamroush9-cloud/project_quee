import { badRequest } from "../utils/httpError.js";

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        badRequest("Validation error", parsed.error.issues.map((i) => ({ path: i.path, message: i.message })))
      );
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        badRequest("Validation error", parsed.error.issues.map((i) => ({ path: i.path, message: i.message })))
      );
    }
    req.query = parsed.data;
    return next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return next(
        badRequest("Validation error", parsed.error.issues.map((i) => ({ path: i.path, message: i.message })))
      );
    }
    req.params = parsed.data;
    return next();
  };
}

