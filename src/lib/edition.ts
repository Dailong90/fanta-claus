import "server-only";
import { userClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api";
import { parseEdition } from "@/lib/identity-contracts";
export async function currentEdition() {
  const client = await userClient(); const { data, error } = await client.rpc("edition_status");
  if (error) throw new ApiError(503, "Edizione temporaneamente non disponibile.");
  return parseEdition(data);
}
export function rpcFailure(error: { code: string }) {
  if (error.code === "42501") throw new ApiError(403, "Operazione non consentita o iscrizioni chiuse.");
  if (error.code === "23505") throw new ApiError(409, "Il profilo esiste già. Ricarica la pagina.");
  if (["23514", "23502", "23503", "22023", "22P02"].includes(error.code)) throw new ApiError(400, "Dati non validi o profilo incompleto.");
  throw new ApiError(503, "Salvataggio non riuscito. Riprova.");
}
