import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { userSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.use(requireAuth);

// GET /api/v1/settings
router.get('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;

    let [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    // Auto-create settings row on first access
    if (!settings) {
      [settings] = await db
        .insert(userSettings)
        .values({ userId })
        .returning();
    }

    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/v1/settings
router.patch('/', async (req, res) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).userId;
    const { notificationsEnabled } = req.body;

    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (!existing) {
      const [created] = await db
        .insert(userSettings)
        .values({ userId, notificationsEnabled: Boolean(notificationsEnabled) })
        .returning();
      res.json({ data: created });
      return;
    }

    const [updated] = await db
      .update(userSettings)
      .set({
        notificationsEnabled:
          notificationsEnabled !== undefined
            ? Boolean(notificationsEnabled)
            : existing.notificationsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
