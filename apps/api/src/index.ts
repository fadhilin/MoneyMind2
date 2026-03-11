  import 'dotenv/config';
  import express from 'express';
  import cors from 'cors';
  import { toNodeHandler } from 'better-auth/node';
  import { auth } from './lib/auth.js';
  import apiRouter from './routes/index.js';
  import path from 'path';

  const app = express();
  const PORT = process.env.PORT ?? 3001;

  const corsOptions: cors.CorsOptions = {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };

  // ─── CORS — applied globally before any handler ──────────────────────────────
  app.use(cors(corsOptions));
  
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`, req.query);
    next();
  });

  // ─── Better Auth ──────────────────────────────────────────────────────────────
  // Use app.use('/auth') so Express strips the /auth prefix correctly.
  // The betterAuth() server config has basePath: '/auth', so Better Auth's
  // internal router correctly handles the stripped path (e.g. /sign-in/email).
 app.all('/auth/*', toNodeHandler(auth));
 
  // ─── Body Parsing ─────────────────────────────────────────────────────────────
  app.use(express.json());

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ─── Health Check ─────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── API v1 ───────────────────────────────────────────────────────────────────
  app.use('/api/v1', apiRouter);

  // ─── 404 Catch-all ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 FinanceControl API running at http://localhost:${PORT}`);
    console.log(`   Auth:   http://localhost:${PORT}/auth`);
    console.log(`   API:    http://localhost:${PORT}/api/v1`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
