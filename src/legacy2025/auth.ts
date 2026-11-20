import "server-only";
import { getSessionFromCookies } from "@/lib/session";
import db from "@/lib/supabaseAdmin";
import { ApiError, isRecord } from "@/lib/api";

export type CurrentPlayer = { ownerId: string; name: string; isAdmin: boolean };

export async function currentPlayer(): Promise<CurrentPlayer | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const { data, error } = await db.from("players").select("owner_id, name, is_admin")
    .eq("owner_id", session.ownerId).maybeSingle();
  if (error) throw new ApiError(503, "Impossibile verificare la sessione.");
  if (!data) return null;
  if (!isRecord(data) || data.owner_id !== session.ownerId || typeof data.is_admin !== "boolean" ||
      (data.name !== null && typeof data.name !== "string")) {
    throw new ApiError(503, "Dati della sessione non validi.");
  }
  return { ownerId: session.ownerId, name: data.name || session.ownerId, isAdmin: data.is_admin };
}

export async function requirePlayer() {
  const player = await currentPlayer();
  if (!player) throw new ApiError(401, "Accesso richiesto.");
  return player;
}

export async function requireAdmin() {
  const player = await requirePlayer();
  if (!player.isAdmin) throw new ApiError(403, "Permessi amministrativi richiesti.");
  return player;
}

export function assertOwner(supplied: unknown, ownerId: string) {
  if (supplied !== undefined && supplied !== null && supplied !== ownerId) {
    throw new ApiError(403, "Non puoi accedere ai dati di un altro partecipante.");
  }
}
