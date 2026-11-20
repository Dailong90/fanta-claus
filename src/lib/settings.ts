import "server-only";
import db from "@/lib/supabaseAdmin";
import { ApiError, isRecord, numberField } from "@/lib/api";
import { VOTE_TYPES, type VotePoints } from "@/lib/votes";
import { VOTING_DEADLINE_ISO } from "@/config/gameConfig";

export async function readSetting(key: string): Promise<unknown> {
  const { data, error } = await db.from("game_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new ApiError(503, "Errore lettura configurazione di gioco.");
  return data ? data.value : undefined;
}

export function parsePublished(value: unknown): boolean {
  if (value === undefined) return false;
  const raw = isRecord(value) ? value.published : value;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["true", "1", "false", "0"].includes(normalized)) return normalized === "true" || normalized === "1";
  }
  throw new ApiError(503, "Stato pubblicazione non valido.");
}
export async function readPublished() { return parsePublished(await readSetting("leaderboard_published")); }

export function validIso(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const day = Number(value.slice(8, 10));
  const month = Number(value.slice(5, 7));
  const year = Number(value.slice(0, 4));
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
export async function readDeadline(): Promise<string | null> {
  const value = await readSetting("team_lock_deadline");
  if (value === undefined) return null;
  if (!isRecord(value) || !validIso(value.deadlineIso)) throw new ApiError(503, "Scadenza squadre non valida.");
  return value.deadlineIso;
}
export function parseVotePoints(value: unknown): VotePoints {
  const points: VotePoints = { best_wrapping: 0, worst_wrapping: 0, most_fitting: 0 };
  if (value === undefined) return points;
  if (!isRecord(value)) throw new ApiError(503, "Configurazione punti non valida.");
  for (const type of VOTE_TYPES) {
    try { points[type] = value[type] === undefined ? 0 : numberField(value[type], type); }
    catch { throw new ApiError(503, "Configurazione punti non valida."); }
  }
  return points;
}
export async function readVotePoints() { return parseVotePoints(await readSetting("vote_points")); }

export async function requirePhase(phase: "teams" | "votes") {
  const deadline = await readDeadline();
  // A missing setting is never authority to mutate historical data.
  if (!deadline) throw new ApiError(503, "Scadenza squadre non configurata. Modifiche sospese.");
  const published = await readPublished();
  const now = Date.now();
  const lock = new Date(deadline).getTime();
  if (published || (phase === "teams" ? now >= lock : now < lock || now >= Date.parse(VOTING_DEADLINE_ISO))) {
    throw new ApiError(403, "Operazione non consentita nella fase corrente.");
  }
}
