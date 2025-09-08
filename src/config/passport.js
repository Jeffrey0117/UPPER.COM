import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { prisma } from "../app.js";
import { logger } from "../utils/logger.js";

// JWT Strategy for protected routes
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            createdAt: true,
          },
        });

        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.OAUTH_REDIRECT_URL}/google`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info("Google OAuth callback received", {
            profileId: profile.id,
            email: profile.emails?.[0]?.value,
          });

          // Check if user exists
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { oauthId: profile.id, oauthProvider: "google" },
                { email: profile.emails?.[0]?.value },
              ],
            },
          });

          if (user) {
            // Update existing user if OAuth details changed
            if (
              user.oauthProvider !== "google" ||
              user.oauthId !== profile.id
            ) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  oauthProvider: "google",
                  oauthId: profile.id,
                  avatar: profile.photos?.[0]?.value || user.avatar,
                },
              });
            }
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                name: profile.displayName || profile.emails?.[0]?.value,
                email: profile.emails?.[0]?.value,
                avatar: profile.photos?.[0]?.value,
                oauthProvider: "google",
                oauthId: profile.id,
                role: "MEMBER",
              },
            });
          }

          return done(null, user);
        } catch (error) {
          logger.error("Google OAuth error:", error);
          return done(error, null);
        }
      }
    )
  );
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.OAUTH_REDIRECT_URL}/github`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info("GitHub OAuth callback received", {
            profileId: profile.id,
            email: profile.emails?.[0]?.value,
          });

          // Check if user exists
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { oauthId: profile.id, oauthProvider: "github" },
                { email: profile.emails?.[0]?.value },
              ],
            },
          });

          if (user) {
            // Update existing user if OAuth details changed
            if (
              user.oauthProvider !== "github" ||
              user.oauthId !== profile.id
            ) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  oauthProvider: "github",
                  oauthId: profile.id,
                  avatar: profile.photos?.[0]?.value || user.avatar,
                },
              });
            }
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                name:
                  profile.displayName ||
                  profile.username ||
                  profile.emails?.[0]?.value,
                email: profile.emails?.[0]?.value,
                avatar: profile.photos?.[0]?.value,
                oauthProvider: "github",
                oauthId: profile.id,
                role: "MEMBER",
              },
            });
          }

          return done(null, user);
        } catch (error) {
          logger.error("GitHub OAuth error:", error);
          return done(error, null);
        }
      }
    )
  );
}

// Serialize user for session (not used in JWT setup, but required by Passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
