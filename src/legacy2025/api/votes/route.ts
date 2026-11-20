import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, textField, onlyFields } from "@/lib/api";
import { requirePlayer, assertOwner } from "@/legacy2025/auth";
import { requirePhase } from "@/lib/settings";
import { requireReference } from "@/lib/references";
import { VOTE_TYPES } from "@/lib/votes";
import { withWriteLock } from "@/lib/writeLock";
export const GET = api(async (req: Request) => {
  const player = await requirePlayer();
  assertOwner(new URL(req.url).searchParams.get("voter_owner_id"), player.ownerId);
  const { data, error } = await db.from("package_votes").select("voter_owner_id, target_owner_id, vote_type").eq("voter_owner_id", player.ownerId);
  if (error) throw new ApiError(503, "Errore caricamento voti.");
  return json({ votes: data ?? [] });
});
export const POST = api(async (req: Request) => {
  const player = await requirePlayer();
  const body = await readBody(req);
  onlyFields(body, ["voter_owner_id", "target_owner_id", "vote_type"]);
  assertOwner(body.voter_owner_id, player.ownerId);
  const target = textField(body.target_owner_id, "target_owner_id");
  const type = textField(body.vote_type, "vote_type");
  if (!VOTE_TYPES.some(value => value === type) || target === player.ownerId) throw new ApiError(400, "Voto non valido.");
  await requirePhase("votes");
  await requireReference("players", "owner_id", target);
  return withWriteLock(`vote:${player.ownerId}:${type}`, async () => {
    await requirePhase("votes");
    const { error } = await db.from("package_votes").upsert({ voter_owner_id: player.ownerId, target_owner_id: target, vote_type: type }, { onConflict: "voter_owner_id,vote_type" });
    if (error) throw new ApiError(503, "Errore salvataggio voto.");
    return json({ ok: true });
  });
});
