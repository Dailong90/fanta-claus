// src/app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
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

const DEFAULT_VOTE_POINTS: VotePointsConfig = {
  best_wrapping: 0,
  worst_wrapping: 0,
  most_fitting: 0,
};

// normalizzazione robusta dei valori che arrivano da Supabase
const NORMALIZED_VOTE_TYPE: Record<string, VoteType | undefined> = {
  best_wrapping: "best_wrapping",
  BEST_WRAPPING: "best_wrapping",
  bestWrapping: "best_wrapping",

  worst_wrapping: "worst_wrapping",
  WORST_WRAPPING: "worst_wrapping",
  worstWrapping: "worst_wrapping",

  most_fitting: "most_fitting",
  MOST_FITTING: "most_fitting",
  mostFitting: "most_fitting",
};

async function isAdminRequest(req: Request): Promise<boolean> {
  const ownerId = req.headers.get("x-fanta-owner-id");
  if (!ownerId) return false;

  const { data, error } = await supabaseAdmin
    .from("players")
    .select("is_admin")
    .eq("owner_id", ownerId)
    .maybeSingle<{ is_admin: boolean }>();

  if (error) {
    console.error("❌ Errore verifica admin in /api/leaderboard", error);
    return false;
  }
  return data?.is_admin === true;
}

function readPublishedFlag(value: unknown): boolean {
  // default false se non troviamo nulla
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "1";
  }

  if (value && typeof value === "object" && "published" in value) {
    const inner = (value as { published?: unknown }).published;
    if (typeof inner === "boolean") return inner;
    if (typeof inner === "string") {
      const lower = inner.toLowerCase().trim();
      return lower === "true" || lower === "1";
    }
  }

  return false;
}

export async function GET(req: Request) {
  // ✅ admin può vedere tutto anche se non pubblicato
  const admin = await isAdminRequest(req);

  // 0) Flag "classifica pubblicata?" da game_settings.leaderboard_published
  let isPublished = false;

  try {
    const { data: publishSetting, error: publishError } = await supabaseAdmin
      .from("game_settings")
      .select("value")
      .eq("key", "leaderboard_published")
      .maybeSingle<{ value: unknown }>();

    if (publishError) {
      console.error(
        "❌ Errore lettura game_settings.leaderboard_published",
        publishError
      );
    }

    if (publishSetting) {
      isPublished = readPublishedFlag(publishSetting.value);
    }
  } catch (err) {
    console.error("❌ Errore runtime lettura leaderboard_published", err);
  }

  // ✅ regola: se NON pubblicato e NON admin → non mostriamo NESSUN punteggio ai profili
  if (!isPublished && !admin) {
    const response: LeaderboardResponse = {
      teams: [],
      isPublished: false,
    };
    return NextResponse.json(response, { status: 200 });
  }

  // 🔒 regola: punti votazioni e dettagli visibili SOLO se pubblicato oppure admin
  const canRevealVoting = isPublished || admin;

  // 1) Squadre
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("owner_id, members, captain_id");

  if (teamsError || !teams) {
    console.error("❌ Errore lettura teams", teamsError);
    return NextResponse.json(
      { error: "Errore caricamento teams" },
      { status: 500 }
    );
  }

  // 2) Giocatori
  const { data: players, error: playersError } = await supabaseAdmin
    .from("players")
    .select("owner_id, name, is_admin");

  if (playersError || !players) {
    console.error("❌ Errore lettura players", playersError);
    return NextResponse.json(
      { error: "Errore caricamento players" },
      { status: 500 }
    );
  }

  // mappa id -> nome
  const playerNameMap = new Map<string, string>();
  (players as PlayerRow[]).forEach((p) => {
    playerNameMap.set(p.owner_id, p.name ?? p.owner_id);
  });

  // 3) Regali
  const { data: gifts, error: giftsError } = await supabaseAdmin
    .from("gifts")
    .select("santa_owner_id, category_id, bonus_points");

  if (giftsError || !gifts) {
    console.error("❌ Errore lettura gifts", giftsError);
    return NextResponse.json(
      { error: "Errore caricamento gifts" },
      { status: 500 }
    );
  }

  // 4) Categorie
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("gift_categories")
    .select("id, points");

  if (categoriesError || !categories) {
    console.error("❌ Errore lettura gift_categories", categoriesError);
    return NextResponse.json(
      { error: "Errore caricamento categorie" },
      { status: 500 }
    );
  }

  // 5) Config punti votazioni
  let votePointsConfig: VotePointsConfig = DEFAULT_VOTE_POINTS;

  if (canRevealVoting) {
    try {
      const { data: voteSettings, error: voteSettingsError } =
        await supabaseAdmin
          .from("game_settings")
          .select("value")
          .eq("key", "vote_points")
          .maybeSingle<{ value: Partial<VotePointsConfig> }>();

      if (!voteSettingsError && voteSettings?.value) {
        votePointsConfig = {
          best_wrapping: Number(voteSettings.value.best_wrapping ?? 0) || 0,
          worst_wrapping: Number(voteSettings.value.worst_wrapping ?? 0) || 0,
          most_fitting: Number(voteSettings.value.most_fitting ?? 0) || 0,
        };
      }
    } catch (err) {
      console.error("❌ Errore lettura game_settings.vote_points", err);
    }
  }

  // 6) Voti (tabella: package_votes)
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

  if (!votesError && votes) {
    const voteRows = votes as VoteRow[];

    // Conta i voti per tipo/target
    const counts: Record<VoteType, Record<string, number>> = {
      best_wrapping: {},
      worst_wrapping: {},
      most_fitting: {},
    };

    voteRows.forEach((v) => {
      const normalized = NORMALIZED_VOTE_TYPE[v.vote_type];
      if (!normalized) return;

      const targetId = v.target_owner_id;
      const voterId = v.voter_owner_id;

      // conteggio per i vincitori
      const current = counts[normalized][targetId] ?? 0;
      counts[normalized][targetId] = current + 1;

      // dettaglio voto singolo (solo se canRevealVoting)
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
        const mapForType = counts[type];
        const entries = Object.entries(mapForType);
        if (entries.length === 0) return;

        const maxVotes = entries.reduce(
          (max, [, value]) => (value > max ? value : max),
          0
        );

        const winnersForType = entries
          .filter(([, value]) => value === maxVotes)
          .map(([targetId, value]) => {
            const pointsAwarded = votePointsConfig[type];

            // ✅ bonus al giocatore vincitore SOLO se canRevealVoting
            if (canRevealVoting) {
              const prev = votingBonusByPlayer.get(targetId) ?? 0;
              votingBonusByPlayer.set(targetId, prev + pointsAwarded);
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

    // ✅ winners visibili SOLO se canRevealVoting
    if (canRevealVoting) {
      votingWinners = winnersResult;
    }
  } else if (votesError) {
    console.error("❌ Errore lettura package_votes", votesError);
  }

  // Mappe punti categorie
  const categoryPointsMap = new Map<string, number>();
  (categories as CategoryRow[]).forEach((c) => {
    categoryPointsMap.set(c.id, c.points);
  });

  // Punti per ogni "santa"
  const giftScoreBySanta = new Map<string, number>();
  (gifts as GiftRow[]).forEach((g) => {
    const base = categoryPointsMap.get(g.category_id) ?? 0;
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

        // ✅ punti votazioni SOLO se canRevealVoting
        const voteBonus = canRevealVoting
          ? votingBonusByPlayer.get(mid) ?? 0
          : 0;

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

  // ✅ info votazioni SOLO se pubblicato o admin
  if (canRevealVoting) {
    response.voting = votingWinners;
    response.votingDetails = votingDetails;
  }

  return NextResponse.json(response);
}
