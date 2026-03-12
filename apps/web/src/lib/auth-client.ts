import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export function useSession() {
  const profile = useLiveQuery(() => db.profile.toCollection().first(), [], "LOADING" as const);
  
  const isPending = (profile as unknown) === "LOADING";
  const user = isPending ? undefined : ((profile as unknown) === "LOADING" ? null : profile);

  return {
    data: (user && (user as unknown) !== "LOADING") ? { user: user as NonNullable<typeof profile> } : (user === undefined ? undefined : null),
    isPending,
  };
}

export const signOut = async () => {
  if (confirm("Yakin ingin menghapus seluruh data lokal? Semua data offline Anda akan hilang dari browser ini.")) {
    await db.delete();
    window.location.href = "/setup";
  }
};

