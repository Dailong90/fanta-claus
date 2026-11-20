import { createHash } from "node:crypto";
import db from "@/lib/supabaseAdmin";
import { ApiError, isRecord } from "@/lib/api";
export type Team = { members: string[]; captain_id: string | null };
export function parseTeam(value: unknown): Team {
  if (!isRecord(value) || !Array.isArray(value.members) || !value.members.every(id => typeof id === "string") ||
      (value.captain_id !== null && typeof value.captain_id !== "string")) throw new ApiError(503, "Dati squadra non validi.");
  return { members: value.members, captain_id: value.captain_id };
}
export function teamVersion(team: Team | null) { return createHash("sha256").update(JSON.stringify(team)).digest("hex"); }
export async function readTeam(ownerId: string) {
  const { data, error } = await db.from("teams").select("members, captain_id").eq("owner_id", ownerId).maybeSingle();
  if (error) throw new ApiError(503, "Errore caricamento squadra.");
  // The 2025 UI treated null members as an empty team; normalize reads only.
  return data ? parseTeam(isRecord(data) && data.members === null ? { ...data, members: [] } : data) : null;
}
