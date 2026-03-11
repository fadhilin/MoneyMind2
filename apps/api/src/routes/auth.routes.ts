import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { db } from '../db/index.js';
import { user, account, otpTokens } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { auth } from '../lib/auth.js'; // 👈 PASTIKAN IMPORT INI BENAR

const router = Router();

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/v1/auth-custom/send-otp ───────────────────────────────────────
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      res.status(400).json({ error: 'Email wajib diisi.' });
      return;
    }

    const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existingUser.length === 0) {
      res.status(404).json({ error: 'Email tidak terdaftar.' });
      return;
    }

    await db
      .update(otpTokens)
      .set({ used: true })
      .where(and(eq(otpTokens.email, email), eq(otpTokens.used, false)));

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    await db.insert(otpTokens).values({ email, code, expiresAt, used: false });
await transporter.sendMail({
      from: `"MoneyMind" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Kode OTP Reset Password - MoneyMind',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px; border: 1px solid #1e293b;">
          
          <h2 style="color: #10b981; margin-top: 0; margin-bottom: 12px; font-size: 24px; font-weight: 700;">🔐 Reset Password</h2>
          
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">Gunakan kode OTP berikut untuk mereset password akun MoneyMind kamu:</p>
          
          <div style="background-color: #020617; border: 1px solid #059669; border-radius: 12px; padding: 32px 24px; text-align: center; margin-bottom: 32px;">
            <p style="font-size: 44px; font-weight: 800; letter-spacing: 16px; color: #34d399; margin: 0; padding-left: 16px;">${code}</p>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 0;">Kode ini berlaku selama <strong style="color: #e2e8f0;">10 menit</strong>.</p>
          
        </div>
      `,
    });

    res.json({ success: true, message: 'Kode OTP telah dikirim ke email kamu.' });
  } catch (err) {
    console.error('[send-otp]', err);
    res.status(500).json({ error: 'Gagal mengirim OTP.' });
  }
});

// ─── POST /api/v1/auth-custom/verify-otp ─────────────────────────────────────
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const now = new Date();
    const token = await db
      .select()
      .from(otpTokens)
      .where(
        and(
          eq(otpTokens.email, email),
          eq(otpTokens.code, code),
          eq(otpTokens.used, false),
          gt(otpTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (token.length === 0) {
      res.status(400).json({ error: 'Kode OTP salah atau sudah kadaluarsa.' });
      return;
    }

    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

// ─── POST /api/v1/auth-custom/reset-password ─────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body as {
      email: string;
      code: string;
      newPassword: string;
    };

    if (!email || !code || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'Input tidak valid atau password terlalu pendek.' });
      return;
    }

    const now = new Date();
    const token = await db
      .select()
      .from(otpTokens)
      .where(
        and(
          eq(otpTokens.email, email),
          eq(otpTokens.code, code),
          eq(otpTokens.used, false),
          gt(otpTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (token.length === 0) {
      res.status(400).json({ error: 'Kode OTP tidak valid.' });
      return;
    }

    const foundUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (foundUser.length === 0) {
      res.status(404).json({ error: 'User tidak ditemukan.' });
      return;
    }

    // 🚀 SOLUSI: Hash password baru menggunakan hasher internal Better Auth,
    // lalu update langsung ke tabel `account` dan `user` via Drizzle.
    // auth.api.changePassword() hanya untuk user yang sedang login (perlu session + currentPassword).
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);

    // Update password di tabel account
    await db
      .update(account)
      .set({ password: hashedPassword })
      .where(
        and(
          eq(account.userId, foundUser[0].id),
          eq(account.providerId, 'credential')
        )
      );

    // Update password di tabel user juga agar sinkron dengan konfigurasi Better Auth
    await db
      .update(user)
      .set({ password: hashedPassword })
      .where(eq(user.id, foundUser[0].id));

    // Tandai OTP sudah digunakan
    await db
      .update(otpTokens)
      .set({ used: true })
      .where(eq(otpTokens.id, token[0].id));

    res.json({ success: true, message: 'Password berhasil direset.' });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ error: 'Gagal mereset password.' });
  }
});

export default router;