import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, textField, numberField, onlyFields } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { requireReference } from "@/lib/references";
import { withWriteLock } from "@/lib/writeLock";
const projection = "santa_owner_id, receiver_owner_id, category_id, bonus_points";
export const GET = api(async () => {
  await requireAdmin();
  const { data, error } = await db.from("gifts").select(projection);
  if (error) throw new ApiError(503, "Errore caricamento regali.");
  return json({ gifts: data ?? [] });
});
export const POST = api(async (req: Request) => {
  await requireAdmin();
  const body = await readBody(req);
  onlyFields(body, ["santa_owner_id", "receiver_owner_id", "category_id", "bonus_points"]);
  const santa = textField(body.santa_owner_id, "santa_owner_id");
  const patch: { category_id?: string; bonus_points?: number; receiver_owner_id?: string | null } = {};
  if ("category_id" in body) patch.category_id = textField(body.category_id, "category_id");
  if ("bonus_points" in body) patch.bonus_points = numberField(body.bonus_points, "bonus_points");
  if ("receiver_owner_id" in body) patch.receiver_owner_id = body.receiver_owner_id === null ? null : textField(body.receiver_owner_id, "receiver_owner_id");
  if (!Object.keys(patch).length) throw new ApiError(400, "Nessun campo da aggiornare.");
  await requireReference("players", "owner_id", santa);
  if (patch.receiver_owner_id) await requireReference("players", "owner_id", patch.receiver_owner_id);
  if (patch.category_id) await requireReference("gift_categories", "id", patch.category_id);
  return withWriteLock(`gift:${santa}`, async () => {
    const { data: existing, error: readError } = await db.from("gifts").select("santa_owner_id").eq("santa_owner_id", santa).maybeSingle();
    if (readError) throw new ApiError(503, "Errore lettura regalo. Nessuna modifica eseguita.");
    if (!existing && !patch.category_id) throw new ApiError(400, "Categoria obbligatoria per un nuovo regalo.");
    // PATCH existing rows: omitted columns never enter the UPDATE, even with concurrent writers.
    const query = existing
      ? db.from("gifts").update(patch).eq("santa_owner_id", santa)
      : db.from("gifts").insert({ santa_owner_id: santa, bonus_points: 0, receiver_owner_id: null, ...patch });
    const { data, error } = await query.select(projection).single();
    if (error || !data) throw new ApiError(503, "Errore salvataggio regalo.");
    return json({ ok: true, gift: data });
  });
});
