export function createHttpError(statusCode, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (details) {
    err.details = details;
  }
  return err;
}

export function notFoundHandler(req, res, next) {
  next(createHttpError(404, 'Route not found'));
}

export function errorHandler(err, req, res, next) {
  const statusCode = Number(err.statusCode) || 500;
  const requestId = req.requestId || 'unknown';
  const response = {
    error: err.message || 'Internal server error',
    requestId,
  };

  if (err.details) {
    response.details = err.details;
  }

  if (statusCode >= 500) {
    console.error(
      JSON.stringify({
        level: 'error',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        message: err.message,
      })
    );
  }

  res.status(statusCode).json(response);
}
