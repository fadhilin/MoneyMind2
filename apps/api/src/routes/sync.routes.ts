import { Router } from "express";
import { db } from "../db/index.js";
import { user, transactions, budgets, savings } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { deviceId, profile, transactions: txs, budgets: bgs, savings: svs } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  try {
    // 1. Ensure user (device) exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.id, deviceId),
    });

    if (!existingUser) {
      await db.insert(user).values({
        id: deviceId,
        name: profile?.name || "Offline User",
        email: `${deviceId}@moneymind.local`, // Dummy email to satisfy unique constraint
        image: profile?.avatar || null,
      });
    } else {
      // Update profile info
      await db
        .update(user)
        .set({
          name: profile?.name || existingUser.name,
          image: profile?.avatar || existingUser.image,
          updatedAt: new Date(),
        })
        .where(eq(user.id, deviceId));
    }

    // 2. Synchronize Data (Simple overwrite for now as it's local-first)
    // In a production app, we'd use timestamps to merge, but for this migration
    // we assume the device is the source of truth if it's the only one.

    await db.transaction(async (tx) => {
      // Sync Transactions
      if (txs && Array.isArray(txs)) {
        // Delete old (or we could do a complex upsert, but overwrite is safer for consistency if client is source of truth)
        await tx.delete(transactions).where(eq(transactions.userId, deviceId));
        if (txs.length > 0) {
          await tx.insert(transactions).values(
            txs.map((t: any) => ({
              id: t.id,
              userId: deviceId,
              amount: t.amount,
              type: t.type,
              category: t.category,
              note: t.note,
              icon: t.icon,
              date: t.date.split("T")[0], // Ensure YYYY-MM-DD
            }))
          );
        }
      }

      // Sync Budgets
      if (bgs && Array.isArray(bgs)) {
        await tx.delete(budgets).where(eq(budgets.userId, deviceId));
        if (bgs.length > 0) {
          await tx.insert(budgets).values(
            bgs.map((b: any) => ({
              id: b.id,
              userId: deviceId,
              category: b.category,
              limitAmount: b.limit,
              icon: b.icon,
              color: b.color,
              description: b.description,
              date: b.date ? b.date.split("T")[0] : null,
            }))
          );
        }
      }

      // Sync Savings
      if (svs && Array.isArray(svs)) {
        await tx.delete(savings).where(eq(savings.userId, deviceId));
        if (svs.length > 0) {
          await tx.insert(savings).values(
            svs.map((s: any) => ({
              id: s.id,
              userId: deviceId,
              name: s.name,
              targetAmount: s.target,
              currentAmount: s.current,
              icon: s.icon,
              color: s.color,
            }))
          );
        }
      }
    });

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to synchronize data" });
  }
});

export default router;
