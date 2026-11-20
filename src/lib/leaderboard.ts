// Historical 2025 calculation shared by public results and admin preview.
import "server-only";
import { ApiError } from "@/lib/api";
import { readPublished, readVotePoints } from "@/lib/settings";
import { normalizeVoteType } from "@/lib/votes";
import supabaseAdmin from "@/lib/supabaseAdmin";

const CAPTAIN_MULTIPLIER = 2;

type TeamRow = {
  owner_id: string;
  members: string[] | null;
  captain_id: string | null;
};

type GiftRow = {
  santa_owner_id: string;
  category_id: string;
  bonus_points: number;
};

type CategoryRow = {
  id: string;
  points: number;
};

type PlayerRow = {
  owner_id: string;
  name: string | null;
  is_admin: boolean | null;
};

type VoteType = "best_wrapping" | "worst_wrapping" | "most_fitting";

type VoteRow = {
  voter_owner_id: string;
  target_owner_id: string;
  vote_type: string; // lo normalizziamo dopo
};

type VotePointsConfig = Record<VoteType, number>;

type MemberScore = {
  id: string;
  name: string;
  points: number;
  isCaptain: boolean;
};

type LeaderboardTeam = {
  ownerId: string;
  ownerName: string;
  totalPoints: number;
  members: MemberScore[];
};

type VotingWinner = {
  ownerId: string;
  ownerName: string;
  votes: number;
  pointsAwarded: number;
};

type LeaderboardVotingWinners = Record<
  VoteType,
  {
    winners: VotingWinner[];
  }
>;

type VoteDetailRow = {
  voterOwnerId: string;
  voterName: string;
  targetOwnerId: string;
  targetName: string;
  pointsApplied: number;
};

type LeaderboardVotingDetails = Record<VoteType, VoteDetailRow[]>;

type LeaderboardResponse = {
  teams: LeaderboardTeam[];
  voting?: LeaderboardVotingWinners;
  votingDetails?: LeaderboardVotingDetails;
  isPublished?: boolean;
};

function buildZeroLeaderboard(params: {
  teams: TeamRow[];
  playerNameMap: Map<string, string>;
}): LeaderboardTeam[] {
  const { teams, playerNameMap } = params;

  // NON sortiamo per punti (sono tutti 0): manteniamo un ordine stabile per ownerName
  return teams
    .map<LeaderboardTeam | null>((t) => {
      const members = t.members ?? [];
      if (!Array.isArray(members) || members.length === 0) return null;

      const captainId = t.captain_id ?? null;

      const membersDetailed: MemberScore[] = members.map((mid) => ({
        id: mid,
        name: playerNameMap.get(mid) ?? mid,
        points: 0,
        isCaptain: captainId === mid,
      }));

      return {
        ownerId: t.owner_id,
        ownerName: playerNameMap.get(t.owner_id) ?? t.owner_id,
        totalPoints: 0,
        members: membersDetailed,
      };
    })
    .filter((t): t is LeaderboardTeam => t !== null)
    .sort((a, b) => a.ownerName.localeCompare(b.ownerName, "it"));
}

export async function loadLeaderboard(admin = false): Promise<LeaderboardResponse> {
  const isPublished = await readPublished();

  // 1) Squadre (servono SEMPRE per mostrare i membri)
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("owner_id, members, captain_id");

  if (teamsError || !teams) {
    throw new ApiError(503, "Errore caricamento teams");
  }

  // 2) Giocatori (nomi)
  const { data: players, error: playersError } = await supabaseAdmin
    .from("players")
    .select("owner_id, name");

  if (playersError || !players) {
    throw new ApiError(503, "Errore caricamento players");
  }

  const playerNameMap = new Map<string, string>();
  (players as PlayerRow[]).forEach((p) => {
    playerNameMap.set(p.owner_id, p.name ?? p.owner_id);
  });

  // ✅ Se NON pubblicato e NON admin: mostra squadre e membri, ma punti=0
  if (!isPublished && !admin) {
    const zeroTeams = buildZeroLeaderboard({
      teams: teams as TeamRow[],
      playerNameMap,
    });

    const response: LeaderboardResponse = {
      teams: zeroTeams,
      isPublished: false,
    };

    return response;
  }

  // Da qui in poi: pubblicato OPPURE admin → calcolo punteggi reali
  const canRevealVoting = isPublished || admin;

  // 3) Regali
  const { data: gifts, error: giftsError } = await supabaseAdmin
    .from("gifts")
    .select("santa_owner_id, category_id, bonus_points");

  if (giftsError || !gifts) {
    throw new ApiError(503, "Errore caricamento gifts");
  }

  // 4) Categorie
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("gift_categories")
    .select("id, points");

  if (categoriesError || !categories) {
    throw new ApiError(503, "Errore caricamento categorie");
  }

  const votePointsConfig: VotePointsConfig = await readVotePoints();

  // 6) Voti
  const { data: votes, error: votesError } = await supabaseAdmin
    .from("package_votes")
    .select("voter_owner_id, target_owner_id, vote_type");

  let votingWinners: LeaderboardVotingWinners | undefined;
  const votingBonusByPlayer = new Map<string, number>();

  const votingDetails: LeaderboardVotingDetails = {
    best_wrapping: [],
    worst_wrapping: [],
    most_fitting: [],
  };

  if (votesError || !votes) throw new ApiError(503, "Errore lettura voti.");
  if (votes) {
    const voteRows = votes as VoteRow[];

    const counts: Record<VoteType, Map<string, number>> = {
      best_wrapping: new Map(),
      worst_wrapping: new Map(),
      most_fitting: new Map(),
    };

    voteRows.forEach((v) => {
      const normalized = normalizeVoteType(v.vote_type);
      if (!normalized) throw new ApiError(503, "Tipo voto non riconosciuto nei dati.");

      const targetId = v.target_owner_id;
      const voterId = v.voter_owner_id;

      counts[normalized].set(targetId, (counts[normalized].get(targetId) ?? 0) + 1);

      if (canRevealVoting) {
        const perVotePoints = votePointsConfig[normalized];
        votingDetails[normalized].push({
          voterOwnerId: voterId,
          voterName: playerNameMap.get(voterId) ?? voterId,
          targetOwnerId: targetId,
          targetName: playerNameMap.get(targetId) ?? targetId,
          pointsApplied: perVotePoints,
        });
      }
    });

    const winnersResult: LeaderboardVotingWinners = {
      best_wrapping: { winners: [] },
      worst_wrapping: { winners: [] },
      most_fitting: { winners: [] },
    };

    (["best_wrapping", "worst_wrapping", "most_fitting"] as VoteType[]).forEach(
      (type) => {
        const entries = Array.from(counts[type].entries());
        if (entries.length === 0) return;

        const maxVotes = entries.reduce(
          (max, [, value]) => (value > max ? value : max),
          0
        );

        const winnersForType = entries
          .filter(([, value]) => value === maxVotes)
          .map(([targetId, value]) => {
            const pointsAwarded = votePointsConfig[type];

            if (canRevealVoting) {
              votingBonusByPlayer.set(
                targetId,
                (votingBonusByPlayer.get(targetId) ?? 0) + pointsAwarded
              );
            }

            return {
              ownerId: targetId,
              ownerName: playerNameMap.get(targetId) ?? targetId,
              votes: value,
              pointsAwarded,
            };
          });

        winnersResult[type] = { winners: winnersForType };
      }
    );

    if (canRevealVoting) votingWinners = winnersResult;
  }

  // Mappe punti categorie
  const categoryPointsMap = new Map<string, number>();
  (categories as CategoryRow[]).forEach((c) => {
    categoryPointsMap.set(c.id, c.points);
  });

  for (const category of categories as CategoryRow[]) {
    if (typeof category.id !== "string" || typeof category.points !== "number" || !Number.isFinite(category.points)) throw new ApiError(503, "Punti categoria non validi.");
  }
  for (const team of teams as TeamRow[]) {
    if (team.members !== null && (!Array.isArray(team.members) || !team.members.every(id => typeof id === "string") || new Set(team.members).size !== team.members.length)) throw new ApiError(503, "Membri squadra non validi.");
  }
  // Punti per ogni "santa"
  const giftScoreBySanta = new Map<string, number>();
  (gifts as GiftRow[]).forEach((g) => {
    const base = categoryPointsMap.get(g.category_id);
    if (base === undefined || (g.bonus_points !== null && (typeof g.bonus_points !== "number" || !Number.isFinite(g.bonus_points)))) throw new ApiError(503, "Regalo non valido per il calcolo.");
    const total = base + (g.bonus_points ?? 0);
    giftScoreBySanta.set(g.santa_owner_id, total);
  });

  // Calcolo punteggio squadre
  const leaderboard: LeaderboardTeam[] = (teams as TeamRow[])
    .map<LeaderboardTeam | null>((t) => {
      const members = t.members ?? [];
      if (!Array.isArray(members) || members.length === 0) return null;

      const captainId = t.captain_id ?? null;

      const membersDetailed: MemberScore[] = members.map((mid) => {
        const baseGift = giftScoreBySanta.get(mid) ?? 0;
        const voteBonus = canRevealVoting ? votingBonusByPlayer.get(mid) ?? 0 : 0;

        const basePts = baseGift + voteBonus;

        const isCaptain = captainId === mid;
        const pts = isCaptain ? basePts * CAPTAIN_MULTIPLIER : basePts;

        return {
          id: mid,
          name: playerNameMap.get(mid) ?? mid,
          points: pts,
          isCaptain,
        };
      });

      const totalPoints = membersDetailed.reduce((sum, m) => sum + m.points, 0);

      return {
        ownerId: t.owner_id,
        ownerName: playerNameMap.get(t.owner_id) ?? t.owner_id,
        totalPoints,
        members: membersDetailed,
      };
    })
    .filter((t): t is LeaderboardTeam => t !== null)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const response: LeaderboardResponse = {
    teams: leaderboard,
    isPublished,
  };

  if (canRevealVoting) {
    response.voting = votingWinners;
    if (admin) response.votingDetails = votingDetails;
  }

  return response;
}
