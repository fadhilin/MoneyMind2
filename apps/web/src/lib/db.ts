import Dexie, { type Table } from 'dexie';
import type { Transaction, Budget, Saving } from '../types/finance';

export interface Profile {
  id: string; // This acts as the deviceId for future sync
  name: string;
  avatar: string; // Base64 or simple icon name
  createdAt: string;
}

export class AppDB extends Dexie {
  profile!: Table<Profile, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  savings!: Table<Saving, string>;

  constructor() {
    super('MoneyMindLocalDB');
    this.version(1).stores({
      // We only index properties we plan to filter or sort by.
      profile: 'id', 
      transactions: 'id, type, category, date',
      budgets: 'id, category, date',
      savings: 'id, name'
    });
  }
}

export const db = new AppDB();
