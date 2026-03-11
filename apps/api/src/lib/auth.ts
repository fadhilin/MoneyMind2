import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

// Pastikan env production ada
if (!process.env.BETTER_AUTH_URL) {
  throw new Error("❌ BETTER_AUTH_URL is not defined in environment variables");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "❌ BETTER_AUTH_SECRET is not defined in environment variables",
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  basePath: "/auth",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustHost: true,

  emailAndPassword: {
    enabled: true,
  },

  // ─── Database Hooks ────────────────────────────────────────────────────────
  databaseHooks: {
    account: {
      create: {
        after: async (acc) => {
          try {
            if (acc.providerId === "credential" && acc.password && acc.userId) {
              await db
                .update(schema.user)
                .set({ password: acc.password })
                .where(eq(schema.user.id, acc.userId));

              console.log("✅ Password synced to USER table");
            }
          } catch (err) {
            console.error("❌ Failed syncing new password:", err);
          }
        },
      },

      update: {
        after: async (acc) => {
          try {
            if (acc.providerId === "credential" && acc.password && acc.userId) {
              await db
                .update(schema.user)
                .set({ password: acc.password })
                .where(eq(schema.user.id, acc.userId));

              console.log("✅ Password update synced");
            }
          } catch (err) {
            console.error("❌ Failed syncing password update:", err);
          }
        },
      },
    },
  },

  // ─── Social Providers ──────────────────────────────────────────────────────
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},

  // ─── Trusted Origins (CORS + Auth) ─────────────────────────────────────────
  trustedOrigins: [
    "https://moneymind-alpha.vercel.app",
    process.env.FRONTEND_URL ?? "http://localhost:5173",
  ],
});

export type Auth = typeof auth;
