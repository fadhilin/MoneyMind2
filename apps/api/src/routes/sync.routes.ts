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
        if (txs.length > 0) {
          // Deduplicate by ID to prevent intra-payload pkey violations
          const uniqueTxs = Array.from(new Map(txs.map((t: any) => [t.id, t])).values());
          
          for (const t of uniqueTxs) {
            await tx.insert(transactions)
              .values({
                id: t.id,
                userId: deviceId,
                amount: t.amount,
                type: t.type,
                category: t.category,
                note: t.note,
                icon: t.icon,
                date: t.date.split("T")[0],
              })
              .onConflictDoUpdate({
                target: [transactions.id],
                set: {
                  amount: t.amount,
                  type: t.type,
                  category: t.category,
                  note: t.note,
                  icon: t.icon,
                  date: t.date.split("T")[0],
                }
              });
          }
        }
      }

      // Sync Budgets
      if (bgs && Array.isArray(bgs)) {
        if (bgs.length > 0) {
          const uniqueBgs = Array.from(new Map(bgs.map((b: any) => [b.id, b])).values());
          for (const b of uniqueBgs) {
            await tx.insert(budgets)
              .values({
                id: b.id,
                userId: deviceId,
                category: b.category,
                limitAmount: b.limit,
                icon: b.icon,
                color: b.color,
                description: b.description,
                date: b.date ? b.date.split("T")[0] : null,
              })
              .onConflictDoUpdate({
                target: [budgets.id],
                set: {
                  category: b.category,
                  limitAmount: b.limit,
                  icon: b.icon,
                  color: b.color,
                  description: b.description,
                  date: b.date ? b.date.split("T")[0] : null,
                  updatedAt: new Date(),
                }
              });
          }
        }
      }

      // Sync Savings
      if (svs && Array.isArray(svs)) {
        if (svs.length > 0) {
          const uniqueSvs = Array.from(new Map(svs.map((s: any) => [s.id, s])).values());
          for (const s of uniqueSvs) {
            await tx.insert(savings)
              .values({
                id: s.id,
                userId: deviceId,
                name: s.name,
                targetAmount: s.target,
                currentAmount: s.current,
                icon: s.icon,
                color: s.color,
              })
              .onConflictDoUpdate({
                target: [savings.id],
                set: {
                  name: s.name,
                  targetAmount: s.target,
                  currentAmount: s.current,
                  icon: s.icon,
                  color: s.color,
                  updatedAt: new Date(),
                }
              });
          }
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
