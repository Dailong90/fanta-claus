import db from "@/lib/supabaseAdmin";
import { api, ApiError, json, readBody, textField, onlyFields } from "@/lib/api";
import { requirePlayer, assertOwner } from "@/legacy2025/auth";
import { requirePhase } from "@/lib/settings";
import { requireReference } from "@/lib/references";
import { readTeam, parseTeam, teamVersion } from "@/lib/teams";
import { withWriteLock } from "@/lib/writeLock";
export const GET = api(async (req: Request) => {
  const player = await requirePlayer();
  assertOwner(new URL(req.url).searchParams.get("owner_id"), player.ownerId);
  const team = await readTeam(player.ownerId);
  return json({ team, version: teamVersion(team) });
});
export const PUT = api(async (req: Request) => {
  const player = await requirePlayer();
  const body = await readBody(req);
  onlyFields(body, ["owner_id", "members", "captain_id", "version"]);
  assertOwner(body.owner_id, player.ownerId);
  const version = textField(body.version, "version", 64);
  if (!Array.isArray(body.members) || body.members.length > 7 || body.members.some(id => typeof id !== "string" || !id.trim() || id.length > 200) ||
      new Set(body.members).size !== body.members.length ||
      (body.captain_id !== null && (typeof body.captain_id !== "string" || !body.members.includes(body.captain_id)))) {
    throw new ApiError(400, "Squadra non valida secondo i vincoli 2025.");
  }
  const team = parseTeam(body);
  await requirePhase("teams");
  for (const id of team.members) await requireReference("players", "owner_id", id);
  return withWriteLock(`team:${player.ownerId}`, async () => {
    const existing = await readTeam(player.ownerId);
    if (teamVersion(existing) === teamVersion(team)) return json({ team: existing, version: teamVersion(existing) });
    if (teamVersion(existing) !== version) throw new ApiError(409, "Squadra modificata altrove. Ricarica prima di continuare.");
    await requirePhase("teams");
    const query = existing
      ? db.from("teams").update(team).eq("owner_id", player.ownerId)
      : db.from("teams").insert({ owner_id: player.ownerId, ...team });
    const { data, error } = await query.select("members, captain_id").single();
    if (error || !data) throw new ApiError(503, "Errore salvataggio squadra.");
    const saved = parseTeam(data);
    return json({ team: saved, version: teamVersion(saved) });
  });
});
