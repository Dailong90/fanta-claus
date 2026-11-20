import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, onlyFields } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { readPublished } from "@/lib/settings";
export const GET = api(async () => json({ published: await readPublished() }));
export const POST = api(async (req: Request) => {
  await requireAdmin();
  const body = await readBody(req);
  onlyFields(body, ["published"]);
  if (typeof body.published !== "boolean") throw new ApiError(400, "Campo published booleano obbligatorio.");
  const { error } = await db.from("game_settings").upsert({ key: "leaderboard_published", value: { published: body.published } }, { onConflict: "key" });
  if (error) throw new ApiError(503, "Errore aggiornamento pubblicazione.");
  return json({ success: true, published: body.published });
});
