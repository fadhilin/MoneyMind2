
import { db } from './src/db/index.js';
import { budgets, transactions } from './src/db/schema.js';
async function run() {
  const allB = await db.select().from(budgets);
  console.log('BUDGETS: ', allB.map(b => ({id: b.id, cat: b.category})));
  const allT = await db.select().from(transactions);
  console.log('TXS: ', allT.map(t => ({id: t.id, cat: t.category, amt: t.amount})));
  process.exit(0);
}
run();

