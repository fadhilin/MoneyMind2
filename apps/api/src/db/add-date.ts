import 'dotenv/config';
import { pool } from './index.js';

async function run() {
  try {
    console.log('Adding date column to budgets table...');
    await pool.query(`ALTER TABLE budgets ADD COLUMN date DATE;`);
    console.log("Column 'date' added successfully.");
  } catch (err: any) {
    if (err.code === '42701') {
      console.log("Column 'date' already exists.");
    } else {
      console.error('Error:', err);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
