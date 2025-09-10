import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import pageRoutes from "./routes/pages.js";
import analyticsRoutes from "./routes/analytics.js";
import fileCreatorRoutes from "./routes/fileCreator.js";
import { publicRouter as publicRoutes } from "./routes/public.js";
import imageRoutes from "./routes/images.js";
import profileRoutes from "./routes/profile.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import { authenticateToken } from "./middleware/auth.js";

// Import Passport configuration
import passport from "./config/passport.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
export const prisma = new PrismaClient();

// Initialize Redis (optional)
let redis = null;
if (process.env.REDIS_URL) {
  redis = createClient({
    url: process.env.REDIS_URL,
  });

  redis.on("error", (err) => logger.error("Redis Client Error", err));

  try {
    await redis.connect();
    logger.info("Redis connected successfully");
  } catch (error) {
    logger.warn(
      "Redis connection failed, continuing without cache:",
      error.message
    );
    redis = null;
  }
}

export { redis };

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.CORS_ORIGIN || "https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection if available
    let redisStatus = "not configured";
    if (redis) {
      try {
        await redis.ping();
        redisStatus = "connected";
      } catch (error) {
        redisStatus = "error";
      }
    }

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: redisStatus,
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", authenticateToken, fileRoutes);
app.use("/api/pages", authenticateToken, pageRoutes);
app.use("/api/analytics", authenticateToken, analyticsRoutes);
app.use("/api/file-creator", authenticateToken, fileCreatorRoutes);
app.use("/api/profile", authenticateToken, profileRoutes);
app.use("/api", imageRoutes); // Image upload routes

// Serve static files FIRST (before public routes)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static(path.join(__dirname, "../public")));

// Public routes (without /api prefix for download pages)
app.use("/", publicRoutes); // This handles /download-page/:slug directly

// Catch-all handler for frontend routes (only for non-static files)
app.get("*", (req, res) => {
  // If it's an API route that doesn't exist, return 404
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  // If it's requesting a static file that exists, let express.static handle it
  const filePath = path.join(__dirname, "../public", req.path);

  // Check for specific admin/platform routes
  if (req.path === "/dashboard" || req.path === "/admin") {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
  } else if (req.path === "/") {
    // Serve the new landing page from root directory
    res.sendFile(path.join(__dirname, "../index.html"));
  } else {
    // For any other route that doesn't exist, redirect to dashboard
    res.redirect("/");
  }
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    await prisma.$disconnect();
    if (redis) {
      await redis.quit();
    }
    logger.info("Database and Redis connections closed.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Lead Magnet Platform server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
