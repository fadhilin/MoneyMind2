import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as budgetService from '../services/budgets.service.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/budgets?month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
    const date = (req.query.date as string) || undefined;
    const data = await budgetService.getBudgets(userId, month, date);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/v1/budgets
router.post('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { category, limitAmount, icon, color, description, date } = req.body;

    if (!category) {
      res.status(400).json({ error: 'category is required' });
      return;
    }

    const created = await budgetService.createBudget(userId, {
      category,
      limitAmount: Number(limitAmount ?? 0),
      icon: icon ?? 'category',
      color: color ?? 'blue-500',
      description,
      date,
    });

    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/v1/budgets/:id
router.patch('/:id', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { category, limitAmount, icon, color, description } = req.body;
    const updated = await budgetService.updateBudget(userId, req.params.id, {
      category,
      limitAmount: limitAmount !== undefined ? Number(limitAmount) : undefined,
      icon,
      color,
      description,
    });
    res.json({ data: updated });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// DELETE /api/v1/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const deleted = await budgetService.deleteBudget(userId, req.params.id);
    res.json({ data: deleted });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// POST /api/v1/budgets/:id/deposit  — record a budget expense
router.post('/:id/deposit', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { amount, date } = req.body;
    if (!amount) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }
    const tx = await budgetService.depositBudget(userId, req.params.id, Number(amount), date);
    res.status(201).json({ data: tx });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /api/v1/budgets/:id/withdraw  — allocate funds, increase limit
router.post('/:id/withdraw', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { amount, date } = req.body;
    if (!amount) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }
    const tx = await budgetService.withdrawBudget(userId, req.params.id, Number(amount), date);
    res.status(201).json({ data: tx });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
