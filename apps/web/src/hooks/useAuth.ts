import { useSession, signIn, signOut, signUp } from '../lib/auth-client';

export function useAuth() {
  const { data: session, isPending, error } = useSession();

  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    error,
    signIn,
    signOut,
    signUp,
  };
}
