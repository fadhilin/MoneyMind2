import { db } from '../db/index.js';
import { savings } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { createTransaction, computeMonthlySummary } from './transactions.service.js';
import type { NewSaving } from '../db/schema.js';

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getSavings(userId: string) {
  return db.select().from(savings).where(eq(savings.userId, userId));
}

export async function createSaving(
  userId: string,
  data: Omit<NewSaving, 'id' | 'userId' | 'currentAmount' | 'createdAt' | 'updatedAt'>,
) {
  const [created] = await db
    .insert(savings)
    .values({ ...data, userId, currentAmount: 0 })
    .returning();
  return created;
}

export async function updateSaving(
  userId: string,
  id: string,
  data: Partial<Pick<NewSaving, 'name' | 'targetAmount' | 'icon' | 'color'>>,
) {
  const [updated] = await db
    .update(savings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(savings.id, id), eq(savings.userId, userId)))
    .returning();

  if (!updated) throw new Error('Saving not found');
  return updated;
}

export async function deleteSaving(userId: string, id: string, date?: string) {
  const [deleted] = await db
    .delete(savings)
    .where(and(eq(savings.id, id), eq(savings.userId, userId)))
    .returning();

  if (!deleted) throw new Error('Saving not found');

  // Refund the current amount back to the primary balance if there is any
  if (deleted.currentAmount > 0) {
    await createTransaction(userId, {
      amount: deleted.currentAmount,
      type: 'income',
      category: 'Refund Tabungan',
      note: `Refund penghapusan target: ${deleted.name}`,
      icon: 'account_balance_wallet',
      date: date || new Date().toISOString().split('T')[0],
    });
  }

  return deleted;
}

/**
 * Deposit into a savings goal.
 * Increases currentAmount and records an expense transaction (money leaves balance).
 */
export async function depositSaving(userId: string, savingId: string, amount: number, date?: string) {
  const [saving] = await db
    .select()
    .from(savings)
    .where(and(eq(savings.id, savingId), eq(savings.userId, userId)));

  if (!saving) throw new Error('Saving not found');

  if (amount > saving.targetAmount - saving.currentAmount) {
    throw new Error(
      `Amount exceeds remaining target. Remaining: Rp ${(saving.targetAmount - saving.currentAmount).toLocaleString('id-ID')}`,
    );
  }

  const [updated] = await db
    .update(savings)
    .set({ currentAmount: saving.currentAmount + amount, updatedAt: new Date() })
    .where(eq(savings.id, savingId))
    .returning();

  const tx = await createTransaction(userId, {
    amount,
    type: 'expense',
    category: 'Tabungan',
    note: `Simpan ke ${saving.name}`,
    icon: 'savings',
    date: date || new Date().toISOString().split('T')[0],
  });

  return { saving: updated, transaction: tx };
}

/**
 * Withdraw from a savings goal.
 * Decreases currentAmount and records an income transaction (money returns to balance).
 */
export async function withdrawSaving(userId: string, savingId: string, amount: number, date?: string) {
  const [saving] = await db
    .select()
    .from(savings)
    .where(and(eq(savings.id, savingId), eq(savings.userId, userId)));

  if (!saving) throw new Error('Saving not found');
  if (amount > saving.currentAmount) {
    throw new Error(
      `Cannot withdraw more than saved. Available: Rp ${saving.currentAmount.toLocaleString('id-ID')}`,
    );
  }

  const [updated] = await db
    .update(savings)
    .set({ currentAmount: Math.max(0, saving.currentAmount - amount), updatedAt: new Date() })
    .where(eq(savings.id, savingId))
    .returning();

  const tx = await createTransaction(userId, {
    amount,
    type: 'income',
    category: 'Tarik Tabungan',
    note: `Ambil dari ${saving.name}`,
    icon: 'account_balance_wallet',
    date: date || new Date().toISOString().split('T')[0],
  });

  return { saving: updated, transaction: tx };
}

/**
 * Auto-allocate 10% of this month's real income to a savings goal.
 */
export async function autoAllocateSaving(userId: string, savingId: string, month: string, date?: string) {
  const summary = await computeMonthlySummary(userId, month);

  const amountToAllocate = Math.round(summary.realIncome * 0.1);

  if (amountToAllocate <= 0) {
    throw new Error('Pemasukan masih Rp 0, target tidak dapat ditentukan');
  }

  if (amountToAllocate > summary.totalBalance) {
    throw new Error(
      `Saldo tidak mencukupi. Dibutuhkan: Rp ${amountToAllocate.toLocaleString('id-ID')}, Tersedia: Rp ${summary.totalBalance.toLocaleString('id-ID')}`,
    );
  }

  return depositSaving(userId, savingId, amountToAllocate, date);
}
