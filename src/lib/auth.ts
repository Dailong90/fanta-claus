import "server-only";
import { ApiError } from "@/lib/api";
import { userClient } from "@/lib/supabase/server";
import { parseAccount, type Account } from "@/lib/identity-contracts";
export async function verifiedIdentity() {
  const client = await userClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || [400, 401, 403].includes(error.status ?? 0)) return null;
    throw new ApiError(503, "Impossibile verificare la sessione.");
  }
  if (!data.user?.email_confirmed_at || !data.user.email) return null;
  return { client, user: data.user };
}
export async function currentAccount(): Promise<Account | null> {
  const identity = await verifiedIdentity();
  if (!identity) return null;
  const { data, error } = await identity.client.rpc("my_account");
  if (error) throw new ApiError(503, "Impossibile leggere il profilo.");
  const account = parseAccount(data);
  if (account.userId !== identity.user.id || account.email !== identity.user.email) throw new ApiError(503, "Identità non coerente.");
  return account;
}
export async function currentPlayer() {
  const account = await currentAccount();
  return account ? { ownerId: account.userId, name: account.profile ? `${account.profile.firstName} ${account.profile.lastName}` : "Completa il profilo", isAdmin: account.isAdmin } : null;
}
export async function requireAccount() {
  const account = await currentAccount();
  if (!account) throw new ApiError(401, "Accesso richiesto.");
  return account;
}
export async function requireAdmin() {
  const account = await requireAccount();
  if (!account.isAdmin) throw new ApiError(403, "Permessi amministrativi per il 2026 richiesti.");
  return account;
}
