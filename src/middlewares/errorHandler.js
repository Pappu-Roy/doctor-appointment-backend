const logger = require("../utils/logger");

// 404 handler — placed after all routes.
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
}

// Centralized error handler — MUST be the last app.use().
// Every controller/service throws ApiError (or lets Prisma/JWT errors
// bubble up); this is the single place that turns them into JSON.
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Prisma unique constraint violation (e.g. duplicate email, double booking)
  if (err.code === "P2002") {
    statusCode = 409;
    message = "A record with this value already exists";
    errors = [{ field: err.meta?.target?.[0] || "unknown", issue: "Duplicate value" }];
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { notFound, errorHandler };
