import express from "express";
import passport from "../config/passport.js";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Initialize Passport
router.use(passport.initialize());

// Login endpoint - returns available OAuth providers
router.get(
  "/login",
  asyncHandler(async (req, res) => {
    const providers = [];

    // For development, always show demo providers
    if (process.env.NODE_ENV === "development") {
      providers.push(
        {
          name: "google",
          url: "/api/auth/google",
          displayName: "Google",
          status:
            process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_ID !== "your_google_client_id"
              ? "active"
              : "demo",
        },
        {
          name: "github",
          url: "/api/auth/github",
          displayName: "GitHub",
          status:
            process.env.GITHUB_CLIENT_ID &&
            process.env.GITHUB_CLIENT_ID !== "your_github_client_id"
              ? "active"
              : "demo",
        }
      );
    } else {
      // Production: only show configured providers
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push({
          name: "google",
          url: "/api/auth/google",
          displayName: "Google",
          status: "active",
        });
      }

      if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        providers.push({
          name: "github",
          url: "/api/auth/github",
          displayName: "GitHub",
          status: "active",
        });
      }
    }

    res.json({
      message: "Available OAuth providers",
      providers,
      note:
        providers.length === 0
          ? "No OAuth providers configured. Please set up GOOGLE_CLIENT_ID/SECRET or GITHUB_CLIENT_ID/SECRET in environment variables."
          : null,
    });
  })
);

// Google OAuth initiation
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  asyncHandler(async (req, res) => {
    try {
      const user = req.user;

      // Generate tokens
      const accessToken = generateJWT({ userId: user.id });
      const refreshToken = generateRefreshToken({ userId: user.id });

      logger.info(`User ${user.email} logged in via Google`, {
        userId: user.id,
        provider: "google",
      });

      // Redirect to admin page with tokens
      res.redirect(
        `/admin.html?token=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      logger.error("Google OAuth callback error:", error);
      res.status(500).json({
        success: false,
        error: "Authentication failed",
        details: error.message,
      });
    }
  })
);

// GitHub OAuth initiation
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

// GitHub OAuth callback
router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  asyncHandler(async (req, res) => {
    try {
      const user = req.user;

      // Generate tokens
      const accessToken = generateJWT({ userId: user.id });
      const refreshToken = generateRefreshToken({ userId: user.id });

      logger.info(`User ${user.email} logged in via GitHub`, {
        userId: user.id,
        provider: "github",
      });

      // Redirect to admin page with tokens
      res.redirect(
        `/admin.html?token=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      logger.error("GitHub OAuth callback error:", error);
      res.status(500).json({
        success: false,
        error: "Authentication failed",
        details: error.message,
      });
    }
  })
);

// Token refresh endpoint
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Refresh token required",
      });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const newAccessToken = generateJWT({ userId: decoded.userId });
      const newRefreshToken = generateRefreshToken({ userId: decoded.userId });

      logger.info(`Token refreshed for user ${decoded.userId}`);

      res.json({
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        },
      });
    } catch (error) {
      logger.warn("Invalid refresh token attempt:", error.message);
      res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }
  })
);

// Get current user info (protected route)
router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    });
  })
);

// Get current user info (legacy endpoint)
router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    });
  })
);

// Logout endpoint
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    // In production, you might want to:
    // 1. Add the token to a blacklist
    // 2. Invalidate the refresh token
    // 3. Log the logout event

    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Extract user info if possible for logging
      logger.info("User logged out");
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  })
);

// Development mode - mock login (only in development)
if (process.env.NODE_ENV === "development") {
  router.post(
    "/dev-login",
    asyncHandler(async (req, res) => {
      const { email, name } = req.body;

      if (!email || !name) {
        return res.status(400).json({
          success: false,
          message: "Email and name are required",
        });
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      // Create user if doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name
            )}&background=667eea&color=fff`,
            role: "MEMBER",
            oauthProvider: "dev-mock",
            oauthId: `dev-${Date.now()}`,
          },
        });
      }

      // Generate JWT token with user ID
      const accessToken = generateJWT({ userId: user.id });
      const refreshToken = generateRefreshToken({ userId: user.id });

      logger.info(`Development login: ${email}`);

      res.json({
        success: true,
        message: "Development login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        },
      });
    })
  );
}

export default router;
