import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as txService from '../services/transactions.service.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/v1/transactions?month=YYYY-MM&type=income|expense&search=...
router.get('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { month, date, type, search } = req.query as Record<string, string>;

    const monthParam = month ?? new Date().toISOString().slice(0, 7);
    const dateParam = date || undefined;
    
    const data = await txService.getTransactions(userId, {
      month: monthParam,
      date: dateParam,
      type: type as 'income' | 'expense' | undefined,
      search,
    });

    const meta = await txService.computeMonthlySummary(userId, monthParam, dateParam);

    res.json({ data, meta });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/v1/transactions
router.post('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { amount, type, category, note, icon, date } = req.body;

    console.log('[POST /transactions] body:', req.body);
    console.log('[POST /transactions] userId:', userId);

    if (!amount || !type || !category || !date) {
      res.status(400).json({ error: 'amount, type, category, and date are required' });
      return;
    }

    const created = await txService.createTransaction(userId, {
      amount: Number(amount),
      type,
      category,
      note,
      icon: icon ?? 'payments',
      date,
    });

    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[POST /transactions] ERROR:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/v1/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const deleted = await txService.deleteTransaction(userId, req.params.id);
    res.json({ data: deleted });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// DELETE /api/v1/transactions/month/:yearMonth  (e.g. 2026-02)
router.delete('/month/:yearMonth', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const deleted = await txService.deleteTransactionsByMonth(userId, req.params.yearMonth);
    res.json({ data: deleted, count: deleted.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/v1/transactions/date/:dateValue (e.g. 2026-03-04)
router.delete('/date/:dateValue', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const deleted = await txService.deleteTransactionsByDate(userId, req.params.dateValue);
    res.json({ data: deleted, count: deleted.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
