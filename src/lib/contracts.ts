import { VOTE_TYPES, type VoteType } from "@/lib/votes";
export function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export type TeamData = { members: string[]; captain_id: string | null };
export type TeamResponse = { team: TeamData | null; version: string };
export function parseTeamResponse(value: unknown): TeamResponse {
  if (!isObject(value) || typeof value.version !== "string" || !value.version) throw new Error("Risposta squadra non valida.");
  if (value.team === null) return { team: null, version: value.version };
  const team = value.team;
  if (!isObject(team) || !Array.isArray(team.members) || !team.members.every(id => typeof id === "string") || (team.captain_id !== null && typeof team.captain_id !== "string")) throw new Error("Dati squadra non validi.");
  return { team: { members: team.members, captain_id: team.captain_id }, version: value.version };
}
export type PlayerInfo = { ownerId: string; name: string; isAdmin: boolean };
export function parseSessionResponse(value: unknown): { player: PlayerInfo | null } {
  if (!isObject(value)) throw new Error("Risposta sessione non valida.");
  if (value.player === null) return { player: null };
  const player = value.player;
  if (!isObject(player) || typeof player.ownerId !== "string" || !player.ownerId || typeof player.name !== "string" || typeof player.isAdmin !== "boolean") throw new Error("Dati sessione non validi.");
  return { player: { ownerId: player.ownerId, name: player.name, isAdmin: player.isAdmin } };
}
export function parseVotesResponse(value: unknown): { votes: { vote_type: VoteType; target_owner_id: string }[] } {
  if (!isObject(value) || !Array.isArray(value.votes)) throw new Error("Risposta voti non valida.");
  const votes = value.votes.map((vote: unknown) => {
    if (!isObject(vote) || typeof vote.target_owner_id !== "string") throw new Error("Dati voto non validi.");
    const type = VOTE_TYPES.find(type => type === vote.vote_type);
    if (!type) throw new Error("Tipo voto non valido.");
    return { vote_type: type, target_owner_id: vote.target_owner_id };
  });
  return { votes };
}
export function parseGiftResponse(value: unknown) {
  if (!isObject(value) || value.ok !== true || !isObject(value.gift)) throw new Error("Conferma regalo non valida.");
  const gift = value.gift;
  if (typeof gift.santa_owner_id !== "string" || typeof gift.category_id !== "string" || (gift.bonus_points !== null && (typeof gift.bonus_points !== "number" || !Number.isFinite(gift.bonus_points))) || (gift.receiver_owner_id !== null && typeof gift.receiver_owner_id !== "string")) throw new Error("Dati regalo non validi.");
  return { category_id: gift.category_id, bonus_points: gift.bonus_points ?? 0 };
}

export type PublicMember = { id: string; name: string; points: number; isCaptain: boolean };
export type PublicTeam = { ownerId: string; ownerName: string; totalPoints: number; members: PublicMember[] };
export type PublicWinner = { ownerId: string; ownerName: string; votes: number };
export function parseLeaderboardResponse(value: unknown): { teams: PublicTeam[]; isPublished: boolean; awards: Record<VoteType, PublicWinner[]> } {
  if (!isObject(value) || !Array.isArray(value.teams) || typeof value.isPublished !== "boolean") throw new Error("Risposta classifica non valida.");
  const teams = value.teams.map((team: unknown) => {
    if (!isObject(team) || typeof team.ownerId !== "string" || typeof team.ownerName !== "string" || typeof team.totalPoints !== "number" || !Number.isFinite(team.totalPoints) || !Array.isArray(team.members)) throw new Error("Dati classifica non validi.");
    const members = team.members.map((member: unknown) => {
      if (!isObject(member) || typeof member.id !== "string" || typeof member.name !== "string" || typeof member.points !== "number" || !Number.isFinite(member.points) || typeof member.isCaptain !== "boolean") throw new Error("Punteggi non validi.");
      return { id: member.id, name: member.name, points: member.points, isCaptain: member.isCaptain };
    });
    return { ownerId: team.ownerId, ownerName: team.ownerName, totalPoints: team.totalPoints, members };
  });
  const awards: Record<VoteType, PublicWinner[]> = { best_wrapping: [], worst_wrapping: [], most_fitting: [] };
  if (value.isPublished) {
    const voting = value.voting;
    if (!isObject(voting)) throw new Error("Premi mancanti nella classifica.");
    for (const type of VOTE_TYPES) {
      const category = voting[type];
      if (!isObject(category) || !Array.isArray(category.winners)) throw new Error("Premi non validi.");
      awards[type] = category.winners.map((winner: unknown) => {
        if (!isObject(winner) || typeof winner.ownerId !== "string" || typeof winner.ownerName !== "string" || typeof winner.votes !== "number" || !Number.isFinite(winner.votes)) throw new Error("Premio non valido.");
        return { ownerId: winner.ownerId, ownerName: winner.ownerName, votes: winner.votes };
      });
    }
  }
  return { teams, isPublished: value.isPublished, awards };
}
