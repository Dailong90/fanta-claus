import { loadLeaderboard } from "@/lib/leaderboard";
import { VOTE_TYPES } from "@/lib/votes";
export async function loadAwards(admin = false) {
  const result = await loadLeaderboard(admin);
  return Object.fromEntries(VOTE_TYPES.map(type => [type, (result.voting?.[type].winners ?? []).map(winner => ({ ownerId: winner.ownerId, ownerName: winner.ownerName, votes: winner.votes }))]));
}
