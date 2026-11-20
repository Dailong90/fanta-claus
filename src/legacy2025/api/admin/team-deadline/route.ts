import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, onlyFields } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { readDeadline, validIso } from "@/lib/settings";
export const GET = api(async () => json({ deadlineIso: await readDeadline() }));
export const POST = api(async (req: Request) => {
  await requireAdmin();
  const body = await readBody(req);
  onlyFields(body, ["deadlineIso"]);
  if (body.deadlineIso !== null && !validIso(body.deadlineIso)) throw new ApiError(400, "Data ISO con fuso orario obbligatoria, oppure null.");
  const deadlineIso = body.deadlineIso === null ? null : new Date(body.deadlineIso).toISOString();
  const query = db.from("game_settings");
  const { error } = deadlineIso === null
    ? await query.delete().eq("key", "team_lock_deadline")
    : await query.upsert({ key: "team_lock_deadline", value: { deadlineIso } }, { onConflict: "key" });
  if (error) throw new ApiError(503, "Errore salvataggio scadenza.");
  return json({ deadlineIso });
});
