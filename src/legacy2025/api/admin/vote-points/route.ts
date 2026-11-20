import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, onlyFields, numberField } from "@/lib/api";
import { requireAdmin } from "@/legacy2025/auth";
import { readVotePoints } from "@/lib/settings";
import { VOTE_TYPES, type VotePoints } from "@/lib/votes";
export const GET = api(async () => { await requireAdmin(); return json({ votePoints: await readVotePoints() }); });
export const POST = api(async (req: Request) => {
  await requireAdmin();
  const body = await readBody(req);
  onlyFields(body, [...VOTE_TYPES]);
  const value: VotePoints = {
    best_wrapping: numberField(body.best_wrapping, "best_wrapping"),
    worst_wrapping: numberField(body.worst_wrapping, "worst_wrapping"),
    most_fitting: numberField(body.most_fitting, "most_fitting"),
  };
  const { error } = await db.from("game_settings").upsert({ key: "vote_points", value }, { onConflict: "key" });
  if (error) throw new ApiError(503, "Errore salvataggio punti.");
  return json({ votePoints: value });
});
