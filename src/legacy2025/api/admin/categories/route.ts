import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, textField, numberField, onlyFields, sameOrigin } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
const projection = "id, code, label, points";
function category(body: Record<string, unknown>) {
  return { code: textField(body.code, "code", 100), label: textField(body.label, "label", 500), points: numberField(body.points, "points") };
}
export const POST = api(async (req: Request) => {
  await requireAdmin();
  const body = await readBody(req); onlyFields(body, ["code", "label", "points"]);
  const { data, error } = await db.from("gift_categories").insert(category(body)).select(projection).single();
  if (error || !data) throw new ApiError(503, "Errore creazione categoria.");
  return json({ category: data });
});
export const PUT = api(async (req: Request) => {
  await requireAdmin();
  const body = await readBody(req); onlyFields(body, ["id", "code", "label", "points"]);
  const id = textField(body.id, "id");
  const { data, error } = await db.from("gift_categories").update(category(body)).eq("id", id).select(projection).maybeSingle();
  if (error) throw new ApiError(503, "Errore aggiornamento categoria.");
  if (!data) throw new ApiError(404, "Categoria inesistente.");
  return json({ category: data });
});
export const DELETE = api(async (req: Request) => {
  await requireAdmin(); sameOrigin(req);
  const id = textField(new URL(req.url).searchParams.get("id"), "id");
  const { data: used, error: checkError } = await db.from("gifts").select("id").eq("category_id", id).limit(1);
  if (checkError) throw new ApiError(503, "Errore verifica regali collegati.");
  if (used?.length) throw new ApiError(409, "Categoria gi? usata in un regalo.");
  // The FK must still be verified on an isolated DB: this check is not atomic.
  const { data, error } = await db.from("gift_categories").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new ApiError(409, "Impossibile eliminare la categoria.");
  if (!data) throw new ApiError(404, "Categoria inesistente.");
  return json({ success: true });
});
