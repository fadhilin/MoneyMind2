import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as reportsService from '../services/reports.service.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/reports/summary?month=YYYY-MM
router.get('/summary', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const date = (req.query.date as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;
    const data = await reportsService.getMonthlySummary(userId, month, date, startDate, endDate);
    res.json({ data, month, date, startDate, endDate });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/v1/reports/budget-distribution?month=YYYY-MM
router.get('/budget-distribution', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const date = (req.query.date as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;
    const data = await reportsService.getBudgetDistribution(userId, month, date, startDate, endDate);
    res.json({ data, month, date, startDate, endDate });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/v1/reports/breakdown?month=YYYY-MM
router.get('/breakdown', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const date = (req.query.date as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;
    const data = await reportsService.getTransactionBreakdown(userId, month, date, startDate, endDate);
    res.json({ data, month, date, startDate, endDate });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/v1/reports/avatar-status
router.get('/avatar-status', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const data = await reportsService.getAvatarStatus(userId);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
