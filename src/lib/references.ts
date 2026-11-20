import db from "@/lib/supabaseAdmin";
import { ApiError } from "@/lib/api";
export async function requireReference(table: "players" | "gift_categories", column: "owner_id" | "id", id: string) {
  const { data, error } = await db.from(table).select(column).eq(column, id).maybeSingle();
  if (error) throw new ApiError(503, "Errore verifica riferimenti.");
  if (!data) throw new ApiError(400, "Riferimento inesistente.");
}
