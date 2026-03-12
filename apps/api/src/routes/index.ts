import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import multer from 'multer'; // Import multer
import path from 'path';     // Import path
import fs from 'fs';         // Import fs

// Import routes
import transactionsRouter from './transactions.routes.js';
import budgetsRouter from './budgets.routes.js';
import savingsRouter from './savings.routes.js';
import reportsRouter from './reports.routes.js';
import settingsRouter from './settings.routes.js';
import authCustomRouter from './auth.routes.js';
import syncRouter from './sync.routes.js';

const router = Router();

// ─── Auth (Better Auth handles all /auth/* paths) ─────────────────────────────
// Must be mounted at root level in index.ts via: app.all('/auth/*', toNodeHandler(auth))

// ─── Konfigurasi Multer untuk Upload ──────────────────────────────────────────
const uploadDir = 'uploads/profiles';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan!'));
    }
  }
});

// Endpoint untuk upload file, akan diakses via /api/v1/upload-profile
router.post('/upload-profile', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada gambar yang diunggah' });
    }

    const baseUrl = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const imageUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error("Gagal memproses upload:", error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// ─── API v1 Routes ────────────────────────────────────────────────────────────
router.use('/transactions', transactionsRouter);
router.use('/budgets', budgetsRouter);
router.use('/savings', savingsRouter);
router.use('/reports', reportsRouter);
router.use('/settings', settingsRouter);
router.use('/auth-custom', authCustomRouter);
router.use('/sync', syncRouter);

export default router;
export { toNodeHandler, auth };