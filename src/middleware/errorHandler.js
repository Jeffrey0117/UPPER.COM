import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error(`Error ${err.statusCode || 500}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
  });

  // Prisma validation error
  if (err.code === "P2002") {
    const message = "Duplicate field value entered";
    error = new AppError(message, 400);
  }

  // Prisma record not found
  if (err.code === "P2025") {
    const message = "Record not found";
    error = new AppError(message, 404);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401);
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File size too large";
    error = new AppError(message, 413);
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field";
    error = new AppError(message, 400);
  }

  // Validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new AppError(message, 400);
  }

  // Redis connection errors
  if (err.code === "ECONNREFUSED" && err.port === 6379) {
    const message = "Cache service unavailable";
    error = new AppError(message, 503);
  }

  // Database connection errors
  if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
    const message = "Database connection failed";
    error = new AppError(message, 503);
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFound = (req, res, next) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};
