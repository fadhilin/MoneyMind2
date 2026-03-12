import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export function useAuth() {
  const profile = useLiveQuery(() => db.profile.toCollection().first());
  const isLoading = profile === undefined;

  return {
    session: profile ? { user: profile } : null,
    user: profile ?? null,
    isAuthenticated: !!profile,
    isLoading,
  };
}
