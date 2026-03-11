import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  basePath: '/auth',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET ?? 'fallback-secret-change-me',
  
  emailAndPassword: {
    enabled: true,
  },

  // ─── Database Hooks ────────────────────────────────────────────────────────
  databaseHooks: {
    account: {
      // Pemicu saat pendaftaran baru (Register)
      create: {
        after: async (acc) => {
          try {
            if (acc.providerId === 'credential' && acc.password && acc.userId) {
              await db
                .update(schema.user)
                .set({ password: acc.password })
                .where(eq(schema.user.id, acc.userId));
              console.log("✅ Berhasil menyalin password ke tabel USER!");
            }
          } catch (err) {
            console.error("❌ Gagal Sinkronisasi Password Baru:", err);
          }
        },
      },
      // Pemicu saat password diubah (Reset Password via auth.api.changePassword)
      update: {
        after: async (acc) => {
          try {
            if (acc.providerId === 'credential' && acc.password && acc.userId) {
              await db
                .update(schema.user)
                .set({ password: acc.password })
                .where(eq(schema.user.id, acc.userId));
            }
          } catch (err) {
            console.error("❌ Gagal Sinkronisasi Perubahan Password:", err);
          }
        },
      },
    },
  },

  // ─── Social Providers ──────────────────────────────────────────────────────
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},

  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/dashboard`,
  ],
});

export type Auth = typeof auth;