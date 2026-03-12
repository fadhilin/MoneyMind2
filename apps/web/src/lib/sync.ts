import { db } from './db';

const SYNC_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1/sync` 
  : "https://moneymind-production.up.railway.app/api/v1/sync";

export async function syncData() {
  if (!navigator.onLine) return; // Only sync if online

  try {
    const profile = await db.profile.toCollection().first();
    if (!profile) return; // Nothing to sync if no profile setup

    const transactions = await db.transactions.toArray();
    const budgets = await db.budgets.toArray();
    const savings = await db.savings.toArray();

    const payload = {
      deviceId: profile.id,
      profile: { name: profile.name, avatar: profile.avatar },
      transactions,
      budgets,
      savings
    };

    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('✅ Synchronized with backend successfully');
    } else {
      console.error('❌ Failed to sync with backend:', await res.text());
    }
  } catch (err) {
    console.error('❌ Sync error:', err);
  }
}

// Background sync controller
let syncInterval: ReturnType<typeof setTimeout> | null = null;

export function startSync() {
  if (syncInterval) clearInterval(syncInterval);
  
  // Initial sync immediately
  setTimeout(syncData, 1000);
  
  // Then every 30 seconds
  syncInterval = setInterval(syncData, 30 * 1000);

  // Sync when coming back online
  window.addEventListener('online', syncData);
}

export function stopSync() {
  if (syncInterval) clearInterval(syncInterval);
  window.removeEventListener('online', syncData);
}
