import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as savingsService from '../services/savings.service.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/savings
router.get('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const data = await savingsService.getSavings(userId);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/v1/savings
router.post('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { name, targetAmount, icon, color } = req.body;

    if (!name || !targetAmount) {
      res.status(400).json({ error: 'name and targetAmount are required' });
      return;
    }

    const created = await savingsService.createSaving(userId, {
      name,
      targetAmount: Number(targetAmount),
      icon: icon ?? 'savings',
      color: color ?? 'blue-500',
    });

    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/v1/savings/:id
router.patch('/:id', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { name, targetAmount, icon, color } = req.body;
    const updated = await savingsService.updateSaving(userId, req.params.id, {
      name,
      targetAmount: targetAmount !== undefined ? Number(targetAmount) : undefined,
      icon,
      color,
    });
    res.json({ data: updated });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// DELETE /api/v1/savings/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const date = req.query.date as string | undefined;
    const deleted = await savingsService.deleteSaving(userId, req.params.id, date);
    res.json({ data: deleted });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// POST /api/v1/savings/:id/deposit
router.post('/:id/deposit', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { amount, date } = req.body;
    if (!amount) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }
    const result = await savingsService.depositSaving(userId, req.params.id, Number(amount), date);
    res.status(201).json({ data: result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /api/v1/savings/:id/withdraw
router.post('/:id/withdraw', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { amount, date } = req.body;
    if (!amount) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }
    const result = await savingsService.withdrawSaving(userId, req.params.id, Number(amount), date);
    res.status(201).json({ data: result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /api/v1/savings/:id/auto-allocate?month=YYYY-MM
router.post('/:id/auto-allocate', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const date = req.query.date as string | undefined;
    const result = await savingsService.autoAllocateSaving(userId, req.params.id, month, date);
    res.status(201).json({ data: result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
