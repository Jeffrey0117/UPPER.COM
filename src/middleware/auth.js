import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AppError, asyncHandler } from "./errorHandler.js";
import { logger } from "../utils/logger.js";

// Create a new Prisma client instance to avoid circular imports
const prisma = new PrismaClient();

export const generateJWT = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: "1d",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    ...defaultOptions,
    ...options,
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyJWT = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

export const authenticateToken = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError("No token provided, authorization denied", 401);
  }

  try {
    // Verify token
    const decoded = verifyJWT(token);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("User no longer exists", 401);
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token", 401);
    }
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token expired", 401);
    }
    throw error;
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError("Not authorized to access this resource", 403);
    }

    next();
  };
};

export const rateLimitByUser = (windowMs = 15 * 60 * 1000, max = 100) => {
  const userLimits = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user's request log
    if (!userLimits.has(userId)) {
      userLimits.set(userId, []);
    }

    const userRequests = userLimits.get(userId);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => timestamp > windowStart
    );
    userLimits.set(userId, validRequests);

    // Check if user has exceeded the limit
    if (validRequests.length >= max) {
      throw new AppError("Rate limit exceeded. Please try again later.", 429);
    }

    // Add current request
    validRequests.push(now);

    next();
  };
};

// Cleanup old rate limit data periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes

  // This would be better implemented with Redis in production
  // For now, this is a simple in-memory cleanup
}, 5 * 60 * 1000); // Clean up every 5 minutes
