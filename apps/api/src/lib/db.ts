import Dexie, { type Table } from "dexie";

// Definisikan struktur data transaksi
export interface LocalTransaction {
  id?: number; // Auto-increment
  amount: number;
  category: string;
  type: "income" | "expense";
  date: string; // Format YYYY-MM-DD
  note?: string;
  synced: number; // 0 = Belum kirim ke server, 1 = Sudah aman di server
}

export class MoneyMindDB extends Dexie {
  transactions!: Table<LocalTransaction>;

  constructor() {
    super("MoneyMindLocal");
    this.version(1).stores({
      // Kita buat index pada 'synced' agar cepat mencari data yang belum dikirim
      transactions: "++id, category, type, date, synced",
    });
  }
}

export const db = new MoneyMindDB();
