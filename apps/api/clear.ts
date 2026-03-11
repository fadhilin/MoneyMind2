import 'dotenv/config';
import { db } from './src/db/index.js';
import { transactions, budgets, savings } from './src/db/schema.js';

async function clearData() {
  console.log('Clearing database...');
  await db.delete(transactions);
  await db.delete(budgets);
  await db.delete(savings);
  console.log('Database cleared!');
  process.exit(0);
}

clearData();
