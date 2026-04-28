import { HttpError } from "../utils/httpError.js";

export function errorHandler(err, req, res, next) {
  const isHttp = err instanceof HttpError;
  const status = isHttp ? err.status : 500;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    error: {
      code: isHttp ? err.code : "INTERNAL_ERROR",
      status,
      message: isHttp ? err.message : "Internal Server Error",
      details: isHttp ? err.details : undefined,
      path: req.originalUrl
    }
  });
}

